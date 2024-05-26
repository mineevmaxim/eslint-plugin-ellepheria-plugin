"use strict";

const path = require('path');
const {isPathRelative} = require('../helpers');
const IMPORT_ERROR = 'IMPORT_ERROR';

function GetNormalizedCurrentFilePath(currentFilePath) {
    const normalizedPath = path.toNamespacedPath(currentFilePath);
    const projectFrom = normalizedPath.split('src')[1];
    if (!projectFrom) {
        return null;
    }
    return projectFrom.split('\\').join('/');
}

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: "feature sliced relative path checker",
            category: "path-checker",
            recommended: false,
            url: null,
        },
        fixable: 'code',
        schema: [
            {
                type: 'object',
                properties: {
                    alias: {
                        type: 'string'
                    }
                }
            }
        ],
        messages: {
            [IMPORT_ERROR]: 'В рамках одного слайса все пути должны быть относительными'
        }
    },

    create(context) {
        const alias = context.options[0].alias || '';

        return {
            ImportDeclaration(node) {
                // example app/entities/Article
                const value = node.source.value
                const importTo = alias ? value.replace(`${alias}/`, '') : value;

                // example C:\Users\tim\Desktop\javascript\production_project\src\entities\Article
                const fromFilename = context.getFilename();

                if(shouldBeRelative(fromFilename, importTo)) {
                    context.report({
                        node: node,
                        messageId: IMPORT_ERROR,
                        fix: (fixer) => {
                            const normalizedPath = GetNormalizedCurrentFilePath(fromFilename)
                                .split('/')
                                .slice(0, -1)
                                .join('/');
                            let relativePath = path.relative(normalizedPath, `/${importTo}`);

                            if (!relativePath.startsWith('.')) {
                                relativePath = './' + relativePath;
                            }
                            return fixer.replaceText(node.source, `'${relativePath}'`)
                        }
                    });
                }
            }
        };
    },
};



const layers = {
    'entities': 'entities',
    'features': 'features',
    'shared': 'shared',
    'pages': 'pages',
    'widgets': 'widgets',
}

function shouldBeRelative(from, to) {
    if(isPathRelative(to)) {
        return false;
    }

    // example entities/Article
    const toArray = to.split('/')
    const toLayer = toArray[0]; // entities
    const toSlice = toArray[1]; // Article

    if(!toLayer || !toSlice || !layers[toLayer]) {
        return false;
    }

    const projectFrom = GetNormalizedCurrentFilePath(from);
    const fromArray = projectFrom.split('/')

    const fromLayer = fromArray[1];
    const fromSlice = fromArray[2];

    if(!fromLayer || !fromSlice || !layers[fromLayer]) {
        return false;
    }

    return fromSlice === toSlice && toLayer === fromLayer;
}
