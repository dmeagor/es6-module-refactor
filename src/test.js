"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_ast_1 = require("ts-simple-ast");
// start typescript compiler api helper
var ast = new ts_simple_ast_1.default();
//add ts project
//ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
//ast.addSourceFiles("../test/VideoTour/**/*{.d.ts,.ts}");
ast.addSourceFiles("../singletest/test.ts");
var sourceFiles = ast.getSourceFiles();
console.log("\nGetting statements");
sourceFiles.forEach(function (sourceFile) {
    var filename = sourceFile.getFilePath();
    for (var _i = 0, _a = sourceFile.getNamespaces()[0].getStatements(); _i < _a.length; _i++) {
        var statement = _a[_i];
        if (ts_simple_ast_1.TypeGuards.isVariableStatement(statement)) {
            for (var _b = 0, _c = statement.getDeclarationList().getDeclarations(); _b < _c.length; _b++) {
                var variableDeclaration = _c[_b];
                console.log("var: " + variableDeclaration.getName());
            }
        }
        else if (ts_simple_ast_1.TypeGuards.isNamedNode(statement))
            console.log("Other: " + statement.getName());
        else {
            //console.error(`Unhandled exported statement: ${statement.getText()}`);
            console.log('unhandled statement');
        }
    }
});
/*
    for (const statement of namespace.getStatements()) {
        if (!TypeGuards.isExportableNode(statement) || !statement.hasExportKeyword())
            continue;
    
        if (TypeGuards.isVariableStatement(statement)) {
            for (const variableDeclaration of statement.getDeclarationList().getDeclarations()) {
                exportNames.push(variableDeclaration.getName());
            }
        }
        else if (TypeGuards.isNamedNode(statement))
            exportNames.push(statement.getName());
        else
            console.error(`Unhandled exported statement: ${statement.getText()}`);
    }
*/ 
//# sourceMappingURL=test.js.map