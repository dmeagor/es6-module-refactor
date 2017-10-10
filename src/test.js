"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_ast_1 = require("ts-simple-ast");
// start typescript compiler api helper
var ast = new ts_simple_ast_1.default();
//add ts project
ast.addSourceFiles("testfile.ts");
var sourceFiles = ast.getSourceFiles();
var sourceFile = sourceFiles[0];
//var named : import
var exportNames = ["hello", "there"];
var allImports = [];
allImports = addToExportList("/sdfgdsfg", exportNames, allImports);
exportNames = ["bill", "bob"];
allImports = addToExportList("/asdfsdfgsdfg", exportNames, allImports);
console.log(allImports);
sourceFile.addImports(allImports);
sourceFile.save();
function addToExportList(moduleSpecifier, exportNames, allImports) {
    var addExportList = [];
    var importDeclaration = {
        moduleSpecifier: moduleSpecifier,
        namedImports: []
    };
    for (var i in exportNames) {
        importDeclaration.namedImports.push({ name: exportNames[i] });
    }
    allImports.push(importDeclaration);
    return allImports;
}
//# sourceMappingURL=test.js.map