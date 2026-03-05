#!/usr/bin/env node

/**
 * memory-master 压缩检测
 * 检查上下文使用率，预防记忆丢失
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 配置
const WORKSPACE_PATH = process.env.WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace');
const MEMORY_DIR = path.join(WORKSPACE_PATH, 'memory');

// 阈值设置
const THRESHOLDS = {
    WARNING: 70,    // 70% - 建议整理
    CRITICAL: 85   // 85% - 立即快照
};

// 估算上下文使用率
function estimateContextUsage() {
    let totalChars = 0;
    const files = [];
    
    // 读取 AGENTS.md
    const agentsPath = path.join(WORKSPACE_PATH, 'AGENTS.md');
    if (fs.existsSync(agentsPath)) {
        const content = fs.readFileSync(agentsPath, 'utf8');
        totalChars += content.length;
        files.push({ name: 'AGENTS.md', chars: content.length });
    }
    
    // 读取 MEMORY.md
    const memoryPath = path.join(WORKSPACE_PATH, 'MEMORY.md');
    if (fs.existsSync(memoryPath)) {
        const content = fs.readFileSync(memoryPath, 'utf8');
        totalChars += content.length;
        files.push({ name: 'MEMORY.md', chars: content.length });
    }
    
    // 统计每日记忆
    const dailyDir = path.join(MEMORY_DIR, 'daily');
    if (fs.existsSync(dailyDir)) {
        const dailyFiles = fs.readdirSync(dailyDir).filter(f => f.endsWith('.md'));
        // 只统计最近7天的记忆
        const recentFiles = dailyFiles.slice(-7);
        for (const file of recentFiles) {
            const content = fs.readFileSync(path.join(dailyDir, file), 'utf8');
            totalChars += content.length;
            files.push({ name: `daily/${file}`, chars: content.length });
        }
    }
    
    // 统计知识库
    const knowledgeDir = path.join(MEMORY_DIR, 'knowledge');
    if (fs.existsSync(knowledgeDir)) {
        const knowledgeFiles = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.md'));
        for (const file of knowledgeFiles) {
            const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf8');
            totalChars += content.length;
            files.push({ name: `knowledge/${file}`, chars: content.length });
        }
    }
    
    // OpenAI 默认上下文窗口 128K tokens ≈ 512K characters
    // 我们使用 200K 作为安全阈值（约 50K tokens）
    const maxChars = 200000;
    const usagePercent = Math.min(100, Math.round((totalChars / maxChars) * 100));
    
    return { percent: usagePercent, totalChars, files };
}

function main() {
    console.log('🔍 Memory Master 压缩检测');
    console.log('='.repeat(40));
    
    const { percent, totalChars, files } = estimateContextUsage();
    
    console.log(`上下文使用率: ${percent}%`);
    console.log(`总字符数: ${totalChars.toLocaleString()}`);
    console.log('');
    
    // 显示各文件占用
    console.log('📄 文件详情:');
    const sortedFiles = files.sort((a, b) => b.chars - a.chars);
    for (const file of sortedFiles.slice(0, 5)) {
        const percentOfTotal = ((file.chars / totalChars) * 100).toFixed(1);
        console.log(`   ${file.name}: ${file.chars.toLocaleString()} 字符 (${percentOfTotal}%)`);
    }
    if (sortedFiles.length > 5) {
        console.log(`   ... 还有 ${sortedFiles.length - 5} 个文件`);
    }
    
    console.log('');
    console.log('='.repeat(40));
    
    // 状态判断
    if (percent >= THRESHOLDS.CRITICAL) {
        console.log('🚨 状态: 危急 - 需要立即快照!');
        console.log('');
        console.log('建议操作:');
        console.log('   1. 运行: node ~/.agents/skills/memory-master/scripts/snapshot.js');
        console.log('   2. 整理旧记忆');
        console.log('   3. 考虑压缩历史记忆');
        return 2; // Critical
    } else if (percent >= THRESHOLDS.WARNING) {
        console.log('⚠️  状态: 警告 - 建议整理');
        console.log('');
        console.log('建议操作:');
        console.log('   1. 考虑运行快照备份');
        console.log('   2. 清理过时的记忆');
        return 1; // Warning
    } else {
        console.log('✅ 状态: 安全');
        console.log('');
        console.log('记忆系统运行正常');
        return 0; // Safe
    }
}

process.exit(main());
