/**
 * KABGEER MASALE — GOOGLE APPS SCRIPT ORDER SYNC RECEIVER
 * 
 * IMPORTANT:
 * For best results, open Apps Script DIRECTLY from inside your Google Sheet:
 * Open your Google Sheet -> Click Extensions -> Apps Script -> Paste this code.
 */

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000); // 10 second timeout lock for concurrent requests
    
    var contents = JSON.parse(e.postData.contents);
    var displayOrderId = contents.displayOrderId || contents.orderId;
    
    if (!displayOrderId) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Missing displayOrderId parameter" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get Target Sheet (Supports Container-bound and Standalone scripts with spreadsheetId)
    var spreadsheet = null;
    if (contents.spreadsheetId) {
      spreadsheet = SpreadsheetApp.openById(contents.spreadsheetId);
    } else {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!spreadsheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Spreadsheet not found. Please open Apps Script directly from your Google Sheet (Extensions -> Apps Script) or provide spreadsheetId." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = spreadsheet.getActiveSheet();
    
    // Auto-create Header Row if Sheet is Empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Display Order ID",
        "Order Timestamp",
        "Customer Name",
        "Customer Email",
        "Customer Phone",
        "Customer Type",
        "Items Summary",
        "Subtotal (₹)",
        "Discount (₹)",
        "Tax (₹)",
        "Shipping Fee (₹)",
        "Total Amount (₹)",
        "Payment Status",
        "Razorpay Payment ID",
        "Shipping Address"
      ]);
      
      // Style Header Row
      var headerRange = sheet.getRange(1, 1, 1, 15);
      headerRange.setBackground("#0F2818");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
    }
    
    // Idempotency Check: Verify if order already exists in sheet
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === displayOrderId) {
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "ignored", 
          message: "Order already exists in spreadsheet (Idempotent call)",
          displayOrderId: displayOrderId 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Format Items Summary
    var itemsSummary = "";
    if (contents.items && contents.items.length > 0) {
      itemsSummary = contents.items.map(function(item) {
        return item.quantity + "x " + item.product_name;
      }).join(", ");
    } else if (contents.itemsSummary) {
      itemsSummary = contents.itemsSummary;
    }
    
    // Format Shipping Address
    var addr = contents.shippingAddress || contents.shipping_address || {};
    var formattedAddress = "";
    if (typeof addr === "object") {
      formattedAddress = (addr.address || "") + 
        (addr.apartment ? ", " + addr.apartment : "") + 
        ", " + (addr.city || "") + 
        ", " + (addr.state || "") + 
        " - " + (addr.pinCode || addr.pin_code || "");
    } else {
      formattedAddress = String(addr);
    }
    
    // Append Order Row
    sheet.appendRow([
      displayOrderId,
      contents.orderTimestamp || new Date().toISOString(),
      contents.customerName || contents.customer_name || "",
      contents.customerEmail || contents.customer_email || "",
      contents.customerPhone || contents.customer_phone || "",
      contents.customerType || contents.customer_type || "guest",
      itemsSummary,
      contents.subtotal || 0,
      contents.discount || 0,
      contents.tax || 0,
      contents.shippingFee || contents.shipping_fee || 0,
      contents.totalAmount || contents.total_amount || 0,
      contents.paymentStatus || contents.payment_status || "Paid",
      contents.razorpayPaymentId || contents.razorpay_payment_id || "",
      formattedAddress
    ]);
    
    lock.releaseLock();
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Order logged to Google Sheet successfully",
      displayOrderId: displayOrderId 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
