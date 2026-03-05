#!/usr/bin/env node

/**
 * memory-master 自动快照
 * 在压缩前保存记忆备份
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 配置
const WORKSPACE_PATH = process.env.WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace');
const MEMORY_DIR = path.join(WORKSPACE_PATH, 'memory');
const SNAPSHOT_DIR = path.join(MEMORY_DIR, 'snapshots');

// 创建快照目录
function ensureSnapshotDir() {
    if (!fs.existsSync(SNAPSHOT_DIR)) {
        fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }
}

// 生成快照文件名
function generateSnapshotName() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `snapshot-${timestamp}`;
}

// 复制文件或目录
function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const files = fs.readdirSync(src);
        for (const file of files) {
            copyRecursive(path.join(src, file), path.join(dest, file));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

// 创建快照
function createSnapshot(name) {
    ensureSnapshotDir();
    
    const snapshotPath = path.join(SNAPSHOT_DIR, name);
    fs.mkdirSync(snapshotPath, { recursive: true });
    
    // 快照内容
    const items = [
        { src: MEMORY_DIR, dest: path.join(snapshotPath, 'memory'), name: 'memory/' },
        { src: path.join(WORKSPACE_PATH, 'AGENTS.md'), dest: path.join(snapshotPath, 'AGENTS.md'), name: 'AGENTS.md' },
        { src: path.join(WORKSPACE_PATH, 'MEMORY.md'), dest: path.join(snapshotPath, 'MEMORY.md'), name: 'MEMORY.md' }
    ];
    
    let copiedCount = 0;
    
    for (const item of items) {
        if (fs.existsSync(item.src)) {
            if (item.src === MEMORY_DIR) {
                copyRecursive(item.src, item.dest);
            } else {
                fs.copyFileSync(item.src, item.dest);
            }
            console.log(`   ✅ ${item.name}`);
            copiedCount++;
        } else {
            console.log(`   ⚠️  ${item.name} (不存在，跳过)`);
        }
    }
    
    return { snapshotPath, copiedCount };
}

// 列出快照
function listSnapshots() {
    if (!fs.existsSync(SNAPSHOT_DIR)) {
        console.log('暂无快照');
        return [];
    }
    
    const snapshots = fs.readdirSync(SNAPSHOT_DIR)
        .filter(f => fs.statSync(path.join(SNAPSHOT_DIR, f)).isDirectory())
        .sort()
        .reverse();
    
    return snapshots;
}

// 显示快照列表
function showSnapshots() {
    const snapshots = listSnapshots();
    
    if (snapshots.length === 0) {
        console.log('📦 快照列表: 暂无快照');
        return;
    }
    
    console.log('📦 快照列表:');
    console.log('='.repeat(50));
    
    for (const snapshot of snapshots) {
        const snapshotPath = path.join(SNAPSHOT_DIR, snapshot);
        const stats = fs.statSync(snapshotPath);
        const date = stats.mtime.toLocaleString('zh-CN');
        
        // 计算快照大小
        let totalSize = 0;
        function calcSize(dir) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    calcSize(fullPath);
                } else {
                    totalSize += stat.size;
                }
            }
        }
        calcSize(snapshotPath);
        
        const sizeKB = (totalSize / 1024).toFixed(1);
        console.log(`   📁 ${snapshot}`);
        console.log(`      日期: ${date} | 大小: ${sizeKB} KB`);
    }
}

// 删除快照
function deleteSnapshot(name) {
    const snapshotPath = path.join(SNAPSHOT_DIR, name);
    if (!fs.existsSync(snapshotPath)) {
        console.log(`❌ 快照不存在: ${name}`);
        return false;
    }
    
    // 递归删除
    function removeDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                removeDir(fullPath);
            } else {
                fs.unlinkSync(fullPath);
            }
        }
        fs.rmdirSync(dir);
    }
    
    removeDir(snapshotPath);
    return true;
}

function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'create';
    
    console.log('📦 Memory Master 快照管理');
    console.log('='.repeat(40));
    
    switch (command) {
        case 'create':
        case 'new':
            // 创建新快照
            const name = args[1] || generateSnapshotName();
            console.log(`创建快照: ${name}`);
            const result = createSnapshot(name);
            console.log('');
            console.log(`✅ 快照创建成功!`);
            console.log(`   位置: ${result.snapshotPath}`);
            console.log(`   已复制: ${result.copiedCount} 项`);
            break;
            
        case 'list':
        case 'ls':
            showSnapshots();
            break;
            
        case 'delete':
        case 'remove':
            const deleteName = args[1];
            if (!deleteName) {
                console.log('❌ 请指定要删除的快照名称');
                console.log('   用法: node snapshot.js delete <snapshot-name>');
                console.log('   列出: node snapshot.js list');
                process.exit(1);
            }
            if (deleteSnapshot(deleteName)) {
                console.log(`✅ 快照已删除: ${deleteName}`);
            }
            break;
            
        case 'restore':
            const restoreName = args[1];
            if (!restoreName) {
                console.log('❌ 请指定要恢复的快照名称');
                process.exit(1);
            }
            console.log(`⚠️  恢复功能待实现`);
            console.log(`   快照位置: ${path.join(SNAPSHOT_DIR, restoreName)}`);
            console.log(`   请手动复制文件到对应位置`);
            break;
            
        default:
            console.log('用法:');
            console.log('   node stats.js create [name]   - 创建快照');
            console.log('   node stats.js list            - 列出快照');
            console.log('   node stats.js delete <name>  - 删除快照');
            console.log('   node stats.js restore <name> - 恢复快照(待实现)');
            break;
    }
    
    console.log('');
    console.log('='.repeat(40));
}

main();
