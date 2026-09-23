const { getInvoiceData, toCsv } = require("../services/invoiceService");

const getInvoice = async (req, res) => {
  try {
    const { format, period } = req.query;
    const invoice = await getInvoiceData(req.user, period);

    if (format === "csv") {
      const csv = toCsv(invoice);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${invoice.billingPeriod}.csv`,
      );
      return res.send(csv);
    }

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getInvoice };
