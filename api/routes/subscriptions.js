// api/routes/subscriptions.js
import express from 'express';
import Subscription from '../models/Subscription.js';
import Organization from '../models/Organization.js';
import Plan from '../models/Plan.js';
import Invoice from '../models/Invoice.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { protect, authorizeRoles } from '../middleware/auth.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Multitenant subscription and billing management
 */

// Middleware to validate organization access
const validateOrganizationAccess = asyncHandler(async (req, res, next) => {
  const organizationId = req.params.organizationId || req.body.organization;
  
  if (!organizationId) {
    return res.status(400).json({
      success: false,
      message: 'Organization ID is required'
    });
  }
  
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    return res.status(404).json({
      success: false,
      message: 'Organization not found'
    });
  }
  
  // Super admin has access to all organizations
  if (req.user.role === 'superadmin') {
    req.organization = organization;
    return next();
  }
  
  // Check if user belongs to this organization and has admin role
  const userOrganization = req.user.organizations.find(
    org => org.organization.toString() === organizationId.toString() && 
           ['admin', 'owner'].includes(org.role)
  );
  
  if (!userOrganization) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to manage subscriptions for this organization'
    });
  }
  
  req.organization = organization;
  req.userOrganization = userOrganization;
  next();
});

/**
 * @swagger
 * /api/v1/subscriptions:
 *   get:
 *     summary: Get subscriptions with multitenant isolation
 *     description: Retrieve subscriptions based on user role and organization access
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *         description: Filter by organization ID (admin only)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, trialing, past_due, canceled, unpaid, incomplete, incomplete_expired]
 *       - in: query
 *         name: plan
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in organization name
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
 */
router.get('/', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    status, 
    plan,
    search,
    organization: orgFilter,
    sortBy = 'currentPeriodEnd',
    sortOrder = 'desc'
  } = req.query;
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build multitenant filter
  const filter = {};
  
  // Super admin can see all subscriptions, others see only their organizations
  if (req.user.role !== 'superadmin') {
    const userOrganizationIds = req.user.organizations
      .filter(org => ['admin', 'owner'].includes(org.role))
      .map(org => org.organization);
    
    filter.organization = { $in: userOrganizationIds };
  }
  
  // Additional filters
  if (status) filter.status = status;
  if (plan) filter.plan = plan;
  if (orgFilter && req.user.role === 'superadmin') {
    filter.organization = orgFilter;
  }
  
  // Search filter
  if (search) {
    filter.$or = [
      { 'organization.name': { $regex: search, $options: 'i' } },
      { 'organization.slug': { $regex: search, $options: 'i' } }
    ];
  }
  
  // Sort configuration
  const sortConfig = {};
  sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const [subscriptions, total, stats] = await Promise.all([
    Subscription.find(filter)
      .populate('organization', 'name slug logo industry size')
      .populate('plan', 'name description features limits price')
      .populate('invoices')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Subscription.countDocuments(filter),
    getSubscriptionStats(filter)
  ]);
  
  res.json({
    success: true,
    data: subscriptions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    stats
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/organization/{organizationId}:
 *   get:
 *     summary: Get organization's current subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
 */
router.get('/organization/:organizationId', validateOrganizationAccess, asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    organization: req.organization._id,
    status: { $in: ['active', 'trialing', 'past_due'] }
  })
    .populate('organization', 'name slug logo')
    .populate('plan', 'name description features limits price')
    .populate({
      path: 'invoices',
      match: { status: 'paid' },
      options: { sort: { createdAt: -1 }, limit: 5 }
    });
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'No active subscription found for this organization',
      data: null
    });
  }
  
  // Add usage metrics
  const usage = await getSubscriptionUsage(req.organization._id, subscription.plan);
  
  res.json({
    success: true,
    data: {
      ...subscription.toObject(),
      usage
    }
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter active plans only
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 */
router.get('/plans', asyncHandler(async (req, res) => {
  const { active = true } = req.query;
  
  const filter = {};
  if (active === 'true') filter.isActive = true;
  
  const plans = await Plan.find(filter)
    .sort({ price: 1 })
    .lean();
  
  res.json({
    success: true,
    data: plans
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Create subscription for organization
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization
 *               - plan
 *               - billingCycle
 *             properties:
 *               organization:
 *                 type: string
 *               plan:
 *                 type: string
 *               billingCycle:
 *                 type: string
 *                 enum: [month, quarter, year]
 *               paymentMethodId:
 *                 type: string
 *                 description: Payment method ID from Stripe or other processor
 *               couponCode:
 *                 type: string
 *               trialDays:
 *                 type: integer
 *                 default: 14
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Subscription created successfully
 */
router.post('/', validateOrganizationAccess, authorizeRoles('admin', 'owner'), asyncHandler(async (req, res) => {
  const { organization, plan, billingCycle, paymentMethodId, couponCode, trialDays = 14, metadata = {} } = req.body;
  
  // Check if organization already has an active subscription
  const existingSubscription = await Subscription.findOne({
    organization: req.organization._id,
    status: { $in: ['active', 'trialing', 'past_due'] }
  });
  
  if (existingSubscription) {
    return res.status(400).json({
      success: false,
      message: 'Organization already has an active subscription'
    });
  }
  
  // Validate plan exists and is active
  const planDetails = await Plan.findById(plan);
  if (!planDetails || !planDetails.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or inactive plan'
    });
  }
  
  // Calculate pricing based on billing cycle
  const price = calculatePlanPrice(planDetails, billingCycle);
  
  const subscription = new Subscription({
    organization: req.organization._id,
    plan: planDetails._id,
    billingCycle,
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: calculatePeriodEnd(new Date(), billingCycle),
    price,
    trialEnd: trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null,
    metadata: {
      createdBy: req.user._id,
      ...metadata
    }
  });
  
  await subscription.save();
  
  // Create initial invoice
  const invoice = new Invoice({
    subscription: subscription._id,
    organization: req.organization._id,
    amount: price,
    currency: 'usd',
    status: 'paid', // Assuming immediate payment for now
    billingPeriod: {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd
    },
    items: [{
      description: `${planDetails.name} Plan (${billingCycle})`,
      amount: price,
      quantity: 1
    }]
  });
  
  await invoice.save();
  
  // Update subscription with invoice
  subscription.invoices.push(invoice._id);
  await subscription.save();
  
  await subscription.populate('organization', 'name slug logo');
  await subscription.populate('plan', 'name description features limits price');
  
  // Send confirmation email
  await sendSubscriptionConfirmation(req.organization, subscription, req.user);
  
  res.status(201).json({
    success: true,
    data: subscription,
    message: 'Subscription created successfully'
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   put:
 *     summary: Update subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: string
 *               billingCycle:
 *                 type: string
 *               status:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const subscription = await Subscription.findById(req.params.id)
    .populate('organization');
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found'
    });
  }
  
  // Authorization check
  if (req.user.role !== 'superadmin') {
    const userOrganization = req.user.organizations.find(
      org => org.organization.toString() === subscription.organization._id.toString() && 
             ['admin', 'owner'].includes(org.role)
    );
    
    if (!userOrganization) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to update this subscription'
      });
    }
  }
  
  const updatedSubscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  )
    .populate('organization', 'name slug logo')
    .populate('plan', 'name description features limits price');
  
  res.json({
    success: true,
    data: updatedSubscription,
    message: 'Subscription updated successfully'
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *                 default: true
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription canceled successfully
 */
router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { cancelAtPeriodEnd = true, reason } = req.body;
  
  const subscription = await Subscription.findById(req.params.id)
    .populate('organization');
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found'
    });
  }
  
  // Authorization check
  if (req.user.role !== 'superadmin') {
    const userOrganization = req.user.organizations.find(
      org => org.organization.toString() === subscription.organization._id.toString() && 
             ['admin', 'owner'].includes(org.role)
    );
    
    if (!userOrganization) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to cancel this subscription'
      });
    }
  }
  
  const updateData = {
    status: cancelAtPeriodEnd ? 'active' : 'canceled',
    canceledAt: new Date(),
    cancelAtPeriodEnd: cancelAtPeriodEnd
  };
  
  if (reason) {
    updateData.cancellationReason = reason;
  }
  
  const updatedSubscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  )
    .populate('organization', 'name slug logo')
    .populate('plan', 'name description features limits price');
  
  // Send cancellation confirmation
  await sendSubscriptionCancellation(subscription.organization, updatedSubscription, req.user);
  
  res.json({
    success: true,
    data: updatedSubscription,
    message: cancelAtPeriodEnd ? 
      'Subscription will be canceled at the end of the billing period' : 
      'Subscription canceled immediately'
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/{id}/upgrade:
 *   post:
 *     summary: Upgrade subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPlan
 *             properties:
 *               newPlan:
 *                 type: string
 *               billingCycle:
 *                 type: string
 *               prorate:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 */
router.post('/:id/upgrade', asyncHandler(async (req, res) => {
  const { newPlan, billingCycle, prorate = true } = req.body;
  
  const subscription = await Subscription.findById(req.params.id)
    .populate('organization')
    .populate('plan');
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found'
    });
  }
  
  // Authorization check
  if (req.user.role !== 'superadmin') {
    const userOrganization = req.user.organizations.find(
      org => org.organization.toString() === subscription.organization._id.toString() && 
             ['admin', 'owner'].includes(org.role)
    );
    
    if (!userOrganization) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to upgrade this subscription'
      });
    }
  }
  
  // Validate new plan
  const newPlanDetails = await Plan.findById(newPlan);
  if (!newPlanDetails || !newPlanDetails.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or inactive plan'
    });
  }
  
  // Calculate upgrade price and proration
  const newPrice = calculatePlanPrice(newPlanDetails, billingCycle || subscription.billingCycle);
  const prorationAmount = prorate ? calculateProration(subscription, newPrice) : 0;
  
  // Update subscription
  subscription.plan = newPlanDetails._id;
  if (billingCycle) subscription.billingCycle = billingCycle;
  subscription.price = newPrice;
  subscription.lastUpgradedAt = new Date();
  
  await subscription.save();
  await subscription.populate('plan', 'name description features limits price');
  
  // Create invoice for prorated amount if applicable
  if (prorationAmount > 0) {
    const invoice = new Invoice({
      subscription: subscription._id,
      organization: subscription.organization._id,
      amount: prorationAmount,
      currency: 'usd',
      status: 'open',
      description: `Prorated upgrade from ${subscription.plan.name} to ${newPlanDetails.name}`,
      items: [{
        description: `Plan upgrade proration`,
        amount: prorationAmount,
        quantity: 1
      }]
    });
    
    await invoice.save();
    subscription.invoices.push(invoice._id);
    await subscription.save();
  }
  
  // Send upgrade confirmation
  await sendSubscriptionUpgrade(subscription.organization, subscription, req.user);
  
  res.json({
    success: true,
    data: subscription,
    message: 'Subscription upgraded successfully',
    proration: {
      amount: prorationAmount,
      currency: 'usd'
    }
  });
}));

/**
 * @swagger
 * /api/v1/subscriptions/{id}/invoices:
 *   get:
 *     summary: Get subscription invoices
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 */
router.get('/:id/invoices', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const subscription = await Subscription.findById(req.params.id);
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'Subscription not found'
    });
  }
  
  // Authorization check
  if (req.user.role !== 'superadmin') {
    const userOrganization = req.user.organizations.find(
      org => org.organization.toString() === subscription.organization.toString() && 
             ['admin', 'owner'].includes(org.role)
    );
    
    if (!userOrganization) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to view these invoices'
      });
    }
  }
  
  const [invoices, total] = await Promise.all([
    Invoice.find({ subscription: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Invoice.countDocuments({ subscription: req.params.id })
  ]);
  
  res.json({
    success: true,
    data: invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// Helper functions
async function getSubscriptionStats(filter) {
  const stats = await Subscription.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'plans',
        localField: 'plan',
        foreignField: '_id',
        as: 'planDetails'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        trialing: { $sum: { $cond: [{ $eq: ['$status', 'trialing'] }, 1, 0] } },
        canceled: { $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0] } },
        pastDue: { $sum: { $cond: [{ $eq: ['$status', 'past_due'] }, 1, 0] } },
        totalMRR: { $sum: '$price' },
        byPlan: {
          $push: {
            plan: { $arrayElemAt: ['$planDetails.name', 0] },
            count: 1
          }
        }
      }
    },
    {
      $project: {
        total: 1,
        byStatus: {
          active: '$active',
          trialing: '$trialing',
          canceled: '$canceled',
          pastDue: '$pastDue'
        },
        totalMRR: 1,
        plans: {
          $arrayToObject: {
            $map: {
              input: '$byPlan',
              as: 'plan',
              in: {
                k: '$$plan.plan',
                v: '$$plan.count'
              }
            }
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    byStatus: { active: 0, trialing: 0, canceled: 0, pastDue: 0 },
    totalMRR: 0,
    plans: {}
  };
}

async function getSubscriptionUsage(organizationId, plan) {
  // This would typically query your usage data
  // For now, returning mock data
  return {
    assessments: {
      used: 45,
      limit: plan.limits?.assessments || 100,
      percentage: 45
    },
    users: {
      used: 23,
      limit: plan.limits?.users || 50,
      percentage: 46
    },
    storage: {
      used: 125, // MB
      limit: plan.limits?.storage || 1024,
      percentage: 12
    }
  };
}

function calculatePlanPrice(plan, billingCycle) {
  const basePrice = plan.price;
  
  switch (billingCycle) {
    case 'year':
      return basePrice * 10; // 2 months free
    case 'quarter':
      return basePrice * 3 * 0.9; // 10% discount
    case 'month':
    default:
      return basePrice;
  }
}

function calculatePeriodEnd(startDate, billingCycle) {
  const endDate = new Date(startDate);
  
  switch (billingCycle) {
    case 'year':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    case 'quarter':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'month':
    default:
      endDate.setMonth(endDate.getMonth() + 1);
      break;
  }
  
  return endDate;
}

function calculateProration(oldSubscription, newPrice) {
  // Simplified proration calculation
  const daysUsed = Math.floor((Date.now() - oldSubscription.currentPeriodStart) / (1000 * 60 * 60 * 24));
  const totalDays = Math.floor((oldSubscription.currentPeriodEnd - oldSubscription.currentPeriodStart) / (1000 * 60 * 60 * 24));
  const unusedAmount = oldSubscription.price * ((totalDays - daysUsed) / totalDays);
  
  return Math.max(0, newPrice - unusedAmount);
}

async function sendSubscriptionConfirmation(organization, subscription, user) {
  await sendEmail({
    to: user.email,
    subject: `Subscription Confirmation - ${organization.name}`,
    template: 'subscription-confirmation',
    context: {
      organizationName: organization.name,
      planName: subscription.plan.name,
      billingCycle: subscription.billingCycle,
      price: subscription.price,
      nextBillingDate: subscription.currentPeriodEnd,
      supportEmail: 'billing@assessly.com'
    }
  });
}

async function sendSubscriptionCancellation(organization, subscription, user) {
  await sendEmail({
    to: user.email,
    subject: `Subscription Cancellation - ${organization.name}`,
    template: 'subscription-cancellation',
    context: {
      organizationName: organization.name,
      planName: subscription.plan.name,
      cancellationDate: new Date().toLocaleDateString(),
      effectiveDate: subscription.cancelAtPeriodEnd ? subscription.currentPeriodEnd : new Date(),
      feedbackUrl: `${process.env.FRONTEND_URL}/feedback`
    }
  });
}

async function sendSubscriptionUpgrade(organization, subscription, user) {
  await sendEmail({
    to: user.email,
    subject: `Subscription Upgraded - ${organization.name}`,
    template: 'subscription-upgrade',
    context: {
      organizationName: organization.name,
      newPlanName: subscription.plan.name,
      billingCycle: subscription.billingCycle,
      newPrice: subscription.price,
      nextBillingDate: subscription.currentPeriodEnd
    }
  });
}

export default router;
