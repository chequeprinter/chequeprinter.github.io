/* =====================================================================
   DONATE CONFIG - the ONE place to set your donation details.
   After editing, rebuild with: python3 build/build.py
   so the static HTML fallback links match too.
   - upiId:        your UPI VPA
   - payeeName:    name shown in our UI and in UPI deep links
   - note:         transaction note shown in the UPI app (deep link)
   - paymentLink:  optional card/netbanking/international link
                   (Razorpay Payment Page, Instamojo, PayPal.me...).
                   Leave "" to hide the "Card / other ways to pay" button.
   - qrImage:      path (from site root) to the UPI QR image.
   Keep the JSON between the markers valid (double quotes, no trailing comma).
   ===================================================================== */
window.CP_DONATE = /*CONFIG-START*/{
  "upiId": "BHARATPE.8L0W0K4N8O74197@fbpe",
  "payeeName": "Cheque Printer",
  "note": "Support Cheque Printer development",
  "paymentLink": "",
  "qrImage": "assets/img/upi-qr.png"
}/*CONFIG-END*/;
