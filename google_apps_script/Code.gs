/**
 * KABGEER MASALE — GOOGLE APPS SCRIPT ORDER SYNC RECEIVER
 * 
 * Instructions for Tanmay / Ayush:
 * 1. Open your Kabgeer Orders Google Sheet.
 * 2. Click Extensions -> Apps Script.
 * 3. Replace all code in Code.gs with this script.
 * 4. Click Deploy -> Manage deployments -> Edit (Pencil) -> Select "New version" -> Click Deploy.
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
    
    // Get Target Sheet
    var spreadsheet = null;
    if (contents.spreadsheetId) {
      spreadsheet = SpreadsheetApp.openById(contents.spreadsheetId);
    } else {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!spreadsheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Spreadsheet not found." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = spreadsheet.getActiveSheet();
    
    // ALWAYS Guarantee Header Row on Row 1 if A1 is not 'Display Order ID'
    var firstCellValue = sheet.getRange(1, 1).getValue();
    if (!firstCellValue || firstCellValue.toString().trim() === "" || firstCellValue.toString() !== "Display Order ID") {
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, 15).setValues([[
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
      ]]);
      
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
