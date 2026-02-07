#!/usr/bin/env node
/**
 * HTML to PDF 변환
 */

import htmlPdf from 'html-pdf-node';
import fs from 'fs/promises';

const htmlFile = process.argv[2];
const pdfFile = process.argv[3];

if (!htmlFile || !pdfFile) {
  console.error('사용법: node convert-to-pdf.js <input.html> <output.pdf>');
  process.exit(1);
}

console.log('📄 PDF 변환 시작...');
console.log(`   입력: ${htmlFile}`);
console.log(`   출력: ${pdfFile}`);

try {
  // HTML 파일 읽기
  const htmlContent = await fs.readFile(htmlFile, 'utf8');
  
  // PDF 옵션
  const options = {
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true,
    preferCSSPageSize: true
  };

  const file = { content: htmlContent };

  console.log('⏳ 변환 중... (시간이 걸릴 수 있습니다)');
  
  const pdfBuffer = await htmlPdf.generatePdf(file, options);
  
  await fs.writeFile(pdfFile, pdfBuffer);
  
  console.log('✅ PDF 변환 완료!');
  console.log(`📁 ${pdfFile}`);
  
  // 파일 크기 확인
  const stats = await fs.stat(pdfFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 파일 크기: ${fileSizeMB}MB`);
  
} catch (error) {
  console.error('❌ 오류:', error.message);
  process.exit(1);
}
