export default function generateNumericOTP(length = 6) {
    let otp = "";
    const digits = "0123456789";
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}
