import React from "react";
import PropTypes from "prop-types";
import { Box, Card, CardContent, Typography, Button, Grid } from "@mui/material";

function PricingCards({ plans = [], onSelectPlan }) {
  return (
    <Box sx={{ py: 4 }}>
      <Grid container spacing={3} justifyContent="center">
        {plans.map((plan, idx) => (
          <Grid item key={idx} xs={12} sm={6} md={4}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 3,
                transition: "all 0.3s ease-in-out",
                "&:hover": { boxShadow: 6, transform: "translateY(-4px)" },
              }}
            >
              <CardContent>
                <Typography variant="h5" gutterBottom color="primary">
                  {plan.name}
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  ${plan.price}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {plan.description}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => onSelectPlan(plan.id)}
                >
                  Choose Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

PricingCards.propTypes = {
  plans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      price: PropTypes.number,
      description: PropTypes.string,
    })
  ).isRequired,
  onSelectPlan: PropTypes.func.isRequired,
};

export default React.memo(PricingCards);
