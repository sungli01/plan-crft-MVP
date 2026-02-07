#!/usr/bin/env node
/**
 * 간단한 PDF 변환 (환경 설정 포함)
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';

const htmlFile = process.argv[2];
const pdfFile = process.argv[3];

if (!htmlFile || !pdfFile) {
  console.error('사용법: node convert-pdf-simple.js <input.html> <output.pdf>');
  process.exit(1);
}

console.log('📄 PDF 변환 시작...');
console.log(`   입력: ${htmlFile}`);
console.log(`   출력: ${pdfFile}`);

try {
  // HTML 내용 읽기
  const htmlContent = await fs.readFile(htmlFile, 'utf8');
  
  console.log('⏳ Chromium 실행 중...');
  
  // Puppeteer 실행 (headless 모드, sandbox 비활성화)
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  console.log('📝 페이지 생성 중...');
  const page = await browser.newPage();
  
  // HTML 로드
  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0'
  });

  console.log('📄 PDF 생성 중...');
  
  // PDF 생성
  await page.pdf({
    path: pdfFile,
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true,
    preferCSSPageSize: true
  });

  await browser.close();

  // 파일 크기 확인
  const stats = await fs.stat(pdfFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n✅ PDF 변환 완료!');
  console.log(`📁 ${pdfFile}`);
  console.log(`📊 파일 크기: ${fileSizeMB}MB`);
  
} catch (error) {
  console.error('\n❌ 오류:', error.message);
  console.error('\n💡 대안:');
  console.error('   1. HTML 파일을 브라우저로 열기');
  console.error('   2. Ctrl+P → PDF로 저장');
  process.exit(1);
}
