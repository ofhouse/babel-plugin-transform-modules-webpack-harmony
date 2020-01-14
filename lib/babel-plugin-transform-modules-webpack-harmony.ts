import * as Babel from '@babel/core';

type BabelT = typeof Babel;
type PluginOptions = {
  webpackRequire?: string;
  webpackExports?: string;
  resolve?: (moduleName: string) => string;
};

export default function(babel: BabelT, options: PluginOptions = {}) {
  let importCounter = -1;

  function resolve(moduleName) {
    return `node_modules/${moduleName}`;
  }

  // Get a incremental number for the modules
  // We use a function here for the increment because when this plugin
  // gets bundled the increment could be triggered by side-effects
  // var counter = b ? b : importCounter++;
  // -> ++ can be triggered here even if b is truthy
  function getModuleCount() {
    importCounter = importCounter + 1;
    return importCounter;
  }

  function safeVarName(moduleName, counter = null, isPure = false) {
    // Replace @ and / in module name with _
    const normalizedModuleName = moduleName.replace(/[\@\/]/g, '_');
    const defaultAppendix = isPure ? '_default' : '';

    const _counter = typeof counter === 'number' ? counter : getModuleCount();
    const varName = `${normalizedModuleName}__WEBPACK_IMPORTED_MODULE_${_counter}__${defaultAppendix}`;

    return {
      name: varName,
      counter: _counter,
    };
  }

  const { types: t } = babel;
  const WEBPACK_REQUIRE = options.webpackRequire || '__webpack_require__';
  const WEBPACK_EXPORTS = options.webpackExports || '__webpack_exports__';
  const resolveModuleSource = options.resolve || resolve;
  const varsToReplace = new Map();

  return {
    name: 'harmony-import',
    visitor: {
      // Rename variables touched by harmony imports
      // This has to be done here because of the interoperability with
      // @babel/preset-react
      ReferencedIdentifier(path) {
        const { node } = path;
        if (node.type === 'Identifier' && varsToReplace.has(node.name)) {
          path.node.name = varsToReplace.get(node.name);
        }
      },

      ImportDeclaration(path) {
        const {
          node: { specifiers, source },
        } = path;

        const harmonyImports = [];
        const varName = safeVarName(source.value);

        specifiers.forEach(specifier => {
          if (specifier.type === 'ImportDefaultSpecifier') {
            // Default imports
            ////////////////////////////////////////////////////////////////////
            // import mod from '@magic/string';
            //
            // mod.test();
            // -->
            // var _magic_string__WP = __webpack_require__('@magic/string');
            // var _magic_string__WP_default = __webpack_require__.n(_magic_string__WP);
            //
            // mod__WP.test();
            ////////////////////////////////////////////////////////////////////
            // TODO:
            // WP introduces new shorter local variables for member calls on
            // default imports like this:
            // import mod from '@magic/string';
            //
            // mod.test();
            // -->
            // var _magic_string__WP = __webpack_require__('@magic/string');
            // var __test = _magic_string__WP["test"];

            // Import module (var _magic_string__WP)
            harmonyImports.push(
              t.variableDeclaration('var', [
                t.variableDeclarator(
                  t.identifier(varName.name),
                  t.callExpression(t.identifier(WEBPACK_REQUIRE), [
                    t.stringLiteral(resolveModuleSource(source.value)),
                  ])
                ),
              ])
            );

            // Pure import for default import (var _magic_string__WP_default)
            // TODO: Find out when this is used
            harmonyImports.push(
              t.variableDeclaration('var', [
                t.variableDeclarator(
                  t.identifier(
                    safeVarName(source.value, varName.counter, true).name
                  ),
                  t.callExpression(
                    t.memberExpression(
                      t.identifier(WEBPACK_REQUIRE),
                      t.identifier('n')
                    ),
                    [t.identifier(varName.name)]
                  )
                ),
              ])
            );

            varsToReplace.set(specifier.local.name, varName.name);
          } else if (specifier.type === 'ImportSpecifier') {
            // Named imports
            ////////////////////////////////////////////////////////////////////
            // import { mod } from '@magic/string';
            //
            // mod.test();
            // -->
            // var _magic_string__WP = __webpack_require__('@magic/string');
            //
            // _magic_string__WP["mod"].test();

            // Only create one import statement for multiple specifiers
            if (harmonyImports.length === 0) {
              harmonyImports.push(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier(varName.name),
                    t.callExpression(t.identifier(WEBPACK_REQUIRE), [
                      t.stringLiteral(resolveModuleSource(source.value)),
                    ])
                  ),
                ])
              );
            }

            varsToReplace.set(
              specifier.local.name,
              `${varName.name}["${specifier.local.name}"]`
            );
          }
        });

        path.replaceWithMultiple(harmonyImports);
      },

      ExportDefaultDeclaration(path) {
        // Default exports
        ////////////////////////////////////////////////////////////////////
        // export default (() => {})
        // -->
        // var _ref = () => {};
        // __webpack_exports__["default"] = (_ref);

        const { node } = path;
        const varName = path.scope.generateUidIdentifierBasedOnNode(node.id);
        const harmonyExport = [
          // Export declaration to var
          t.variableDeclaration('var', [
            t.variableDeclarator(t.identifier(varName.name), node.declaration),
          ]),
          // __webpack_exports__
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(
                t.identifier(WEBPACK_EXPORTS),
                t.stringLiteral('default'),
                true
              ),
              t.parenthesizedExpression(t.identifier(varName.name))
            )
          ),
        ];

        path.replaceWithMultiple(harmonyExport);
      },
    },
  };
}
