#!/usr/bin/env node
/**
 * 중단된 생성 작업 이어서 하기
 */

import { readFile } from 'fs/promises';
import { exec } from 'child_process';

const progressDir = './progress';

// 가장 최근 프로젝트 찾기
async function findLatestProject() {
  try {
    const { stdout } = await new Promise((resolve, reject) => {
      exec(`ls -t ${progressDir}/*_200p_*.json | grep -v section | head -1`, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });
    
    const progressFile = stdout.trim();
    if (!progressFile) {
      console.error('❌ 진행 중인 프로젝트를 찾을 수 없습니다.');
      process.exit(1);
    }
    
    const data = JSON.parse(await readFile(progressFile, 'utf8'));
    return data;
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

// 메인
const progress = await findLatestProject();
console.log('📁 찾은 프로젝트:', progress.projectId);
console.log('✅ 완료된 섹션:', progress.completedSections.length, '개');
console.log('⏳ 남은 섹션:', 120 - progress.completedSections.length, '개');
console.log('\n🔄 이어서 생성을 시작합니다...\n');

// 기존 projectId를 환경 변수로 전달
process.env.RESUME_PROJECT_ID = progress.projectId;

// generate-200p.js를 import해서 실행
await import('./generate-200p.js');
