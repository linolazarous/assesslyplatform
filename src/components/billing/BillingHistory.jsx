import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Alert } from "@mui/material";

function BillingHistory({ records = [] }) {
  if (!records.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No billing records found.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Billing History
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record, idx) => (
            <TableRow key={idx}>
              <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
              <TableCell>{record.plan}</TableCell>
              <TableCell align="right">${record.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

BillingHistory.propTypes = {
  records: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      plan: PropTypes.string.isRequired,
      amount: PropTypes.number.isRequired,
    })
  ),
};

export default React.memo(BillingHistory);
