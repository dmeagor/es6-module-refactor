import Ast, { SourceFile, TypeGuards, ImportDeclarationStructure}  from "ts-simple-ast";
import * as _ from "underscore";
import * as ts from "typescript";

// start typescript compiler api helper
const ast = new Ast();

//add ts project
ast.addSourceFiles("testfile.ts");
const sourceFiles = ast.getSourceFiles();

var sourceFile = sourceFiles[0];

//var named : import

var exportNames = ["hello","there"];
var allImports : ImportDeclarationStructure[] = [];

allImports = addToExportList("/sdfgdsfg",exportNames,allImports);
exportNames = ["bill","bob"];
allImports = addToExportList("/asdfsdfgsdfg",exportNames,allImports);



console.log(allImports);
sourceFile.addImports(allImports);
sourceFile.save();



function addToExportList(moduleSpecifier : string, exportNames : string[], allImports: ImportDeclarationStructure[]) : ImportDeclarationStructure[]{
    var addExportList = [];
        
    var importDeclaration : ImportDeclarationStructure = {
        moduleSpecifier: moduleSpecifier,
        namedImports: []
    }
    
    for (var i in exportNames) {
        importDeclaration.namedImports.push({name: exportNames[i]});
    }
    
    allImports.push(importDeclaration);
    
    return allImports;
}

