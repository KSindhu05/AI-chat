const http = require('http');

// Create a minimal valid PDF in buffer
const pdfContent = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n' +
  '4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\n' +
  '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n' +
  'xref\n0 6\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF'
);

const boundary = '----TestBoundary123';
const CRLF = '\r\n';

const bodyParts = [
  '--' + boundary + CRLF,
  'Content-Disposition: form-data; name="pdf"; filename="test.pdf"' + CRLF,
  'Content-Type: application/pdf' + CRLF,
  CRLF,
];
const bodyEnd = CRLF + '--' + boundary + '--' + CRLF;

const bodyBuffer = Buffer.concat([
  Buffer.from(bodyParts.join('')),
  pdfContent,
  Buffer.from(bodyEnd),
]);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/upload-pdf',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3RfdXNlcl9pZCIsImlhdCI6MTc3Nzc5OTQwMCwiZXhwIjoxNzc3ODAzMDAwfQ.MXZQEXLSks9w3LfOUFMWiWcZ_9S_ZhIS8YG5wVf3Fgg',
    'Content-Length': bodyBuffer.length,
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.log('Connection error:', e.message));
req.write(bodyBuffer);
req.end();
