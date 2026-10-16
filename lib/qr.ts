import QRCode from "qrcode";

export function qrPng(url: string) {
  return QRCode.toBuffer(url, {
    type: "png",
    width: 640,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

export function qrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
