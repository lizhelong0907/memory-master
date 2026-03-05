#!/usr/bin/env node

/**
 * memory-master 统计功能
 * 显示记忆系统使用情况统计
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const WORKSPACE_PATH = process.env.WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace');
const MEMORY_DIR = path.join(WORKSPACE_PATH, 'memory');

function countFiles(dir, extensions = ['.md']) {
    let count = 0;
    let totalSize = 0;
    
    if (!fs.existsSync(dir)) return { count: 0, size: 0 };
    
    function walk(directory) {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            const fullPath = path.join(directory, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (extensions.some(ext => file.endsWith(ext))) {
                count++;
                totalSize += stat.size;
            }
        }
    }
    
    walk(dir);
    return { count, size: totalSize };
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function main() {
    console.log('📊 Memory Master 统计信息');
    console.log('='.repeat(40));
    console.log(`工作空间: ${WORKSPACE_PATH}`);
    console.log('');
    
    // 每日记忆统计
    const dailyDir = path.join(MEMORY_DIR, 'daily');
    const daily = countFiles(dailyDir);
    console.log(`📝 每日记忆 (memory/daily/)`);
    console.log(`   文件数: ${daily.count}`);
    console.log(`   总大小: ${formatSize(daily.size)}`);
    
    // 知识库统计
    const knowledgeDir = path.join(MEMORY_DIR, 'knowledge');
    const knowledge = countFiles(knowledgeDir);
    console.log('');
    console.log(`📚 知识库 (memory/knowledge/)`);
    console.log(`   文件数: ${knowledge.count}`);
    console.log(`   总大小: ${formatSize(knowledge.size)}`);
    
    // 索引文件
    const dailyIndex = path.join(MEMORY_DIR, 'daily-index.md');
    const knowledgeIndex = path.join(MEMORY_DIR, 'knowledge-index.md');
    console.log('');
    console.log(`📑 索引文件`);
    console.log(`   daily-index.md: ${fs.existsSync(dailyIndex) ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`   knowledge-index.md: ${fs.existsSync(knowledgeIndex) ? '✅ 存在' : '❌ 缺失'}`);
    
    // 核心文件
    console.log('');
    console.log(`🏠 核心文件`);
    const files = ['AGENTS.md', 'MEMORY.md', 'HEARTBEAT.md'];
    for (const file of files) {
        const filePath = path.join(WORKSPACE_PATH, file);
        const exists = fs.existsSync(filePath);
        const size = exists ? fs.statSync(filePath).size : 0;
        console.log(`   ${file}: ${exists ? '✅ ' + formatSize(size) : '❌ 缺失'}`);
    }
    
    // 总计
    console.log('');
    console.log('📈 总计');
    console.log(`   记忆文件总数: ${daily.count + knowledge.count}`);
    console.log(`   总存储大小: ${formatSize(daily.size + knowledge.size)}`);
    
    console.log('');
    console.log('='.repeat(40));
}

main();
