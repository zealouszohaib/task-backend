// Utility to validate and sanitize hierarchical tree data

function generateNewUniqueId(existingIds) {
    // Simple unique ID generator (can be replaced with uuid or nanoid)
    let newId;
    do {
        newId = 'node_' + Math.random().toString(36).substr(2, 9);
    } while (existingIds.has(newId));
    return newId;
}

function ensureUniqueIds(treeData) {
    const seenIds = new Set();
    for (const node of treeData) {
        if (seenIds.has(node.id)) {
            node.id = generateNewUniqueId(seenIds);
        }
        seenIds.add(node.id);
    }
}

function fixMissingParents(treeData) {
    for (const node of treeData) {
        if (node.parentId && !treeData.find(n => n.id === node.parentId)) {
            // Assign to root if parent is missing
            node.parentId = null;
        }
    }
}

function handleUnnamedNodes(treeData) {
    for (const node of treeData) {
        if (!node.name || node.name.trim() === '') {
            node.name = 'Unnamed Node';
        }
    }
}

function hasCycle(treeData) {
    // Build adjacency list
    const graph = {};
    treeData.forEach(n => {
        if (!graph[n.parentId]) graph[n.parentId] = [];
        graph[n.parentId].push(n.id);
    });

    const visited = new Set();
    const stack = new Set();

    function dfs(nodeId) {
        if (stack.has(nodeId)) return true; // Cycle found
        if (visited.has(nodeId)) return false;

        visited.add(nodeId);
        stack.add(nodeId);

        const children = graph[nodeId] || [];
        for (const childId of children) {
            if (dfs(childId)) return true;
        }

        stack.delete(nodeId);
        return false;
    }

    return treeData.some(n => dfs(n.id));
}

function validateTreeData(treeData) {
    ensureUniqueIds(treeData);
    fixMissingParents(treeData);
    handleUnnamedNodes(treeData);
    if (hasCycle(treeData)) {
        throw new Error('Circular hierarchy detected');
    }
    return treeData;
}

module.exports = {
    validateTreeData,
    ensureUniqueIds,
    fixMissingParents,
    handleUnnamedNodes,
    hasCycle,
};
