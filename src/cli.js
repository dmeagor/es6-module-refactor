"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_ast_1 = require("ts-simple-ast");
var ProgressBar = require("progress");
var ExportType;
(function (ExportType) {
    ExportType[ExportType["Single"] = 1] = "Single";
    ExportType[ExportType["Multiple"] = 2] = "Multiple";
})(ExportType || (ExportType = {}));
// start typescript compiler api helper
var ast = new ts_simple_ast_1.default();
//add ts project
//ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
var basePath = "C:/Users/dmeag/Source/Repos/test/VideoTour/";
ast.addSourceFiles("C:/Users/dmeag/Source/Repos/test/VideoTour/**/*{.d.ts,.ts}");
var sourceFiles = ast.getSourceFiles();
console.log("\nAnalysing source files for dependencies");
var bar = new ProgressBar('[:bar] ETA :eta seconds ...:filename', { total: sourceFiles.length, width: 40 });
var data = [];
//FIRST PASS - ANALYSE LOOP.  Populate FileData object
/**********************************************************/
sourceFiles.forEach(function (sourceFile) {
    //console.log("\nstart:"+sourceFile.getFilePath());
    bar.tick({ filename: sourceFile.getFilePath().slice(-100) });
    bar.render();
    var namespaces = sourceFile.getNamespaces();
    if (namespaces.length > 0) {
        //find namespace identifier (they are nested due to being fully qualified)
        var namespace = namespaces[0];
        var nameIdentifiers = namespace.getNameIdentifiers();
        var finalIdentifier = nameIdentifiers[nameIdentifiers.length - 1];
        //find references
        var referencedSymbols = finalIdentifier.findReferences();
        var references = referencedSymbols[0].getReferences(); // probably not unique, needs to check by scriptname
        references.forEach(function (element) {
            //if (TypeGuards.isNamespaceDeclaration(element.getNode())){
            //    console.log("skipping module definition");
            //}else{
            var referenceSourceFile = element.getSourceFile();
            var referenceSourceFilePath = referenceSourceFile.getFilePath();
            if (!data[referenceSourceFilePath]) {
                data[referenceSourceFilePath] = {
                    sourceFile: referenceSourceFile,
                    requires: []
                };
            }
            if (referenceSourceFilePath != sourceFile.getFilePath()) {
                data[referenceSourceFilePath].requires[sourceFile.getFilePath()] = 1;
            }
            // }
            //console.log("--->"+referenceSourceFilePath);
        });
        //loop through the statements, check for exports, get names and push them into an array for later.
        var exportNames = [];
        for (var _i = 0, _a = namespace.getStatements(); _i < _a.length; _i++) {
            var statement = _a[_i];
            if (!ts_simple_ast_1.TypeGuards.isExportableNode(statement) || !statement.hasExportKeyword())
                continue;
            if (ts_simple_ast_1.TypeGuards.isVariableStatement(statement)) {
                for (var _b = 0, _c = statement.getDeclarationList().getDeclarations(); _b < _c.length; _b++) {
                    var variableDeclaration = _c[_b];
                    exportNames.push(variableDeclaration.getName());
                }
            }
            else if (ts_simple_ast_1.TypeGuards.isNamedNode(statement))
                exportNames.push(statement.getName());
            else
                console.error("Unhandled exported statement: " + statement.getText());
        }
        references.forEach(function (reference) {
            var node = reference.getNode();
            if (ts_simple_ast_1.TypeGuards.isTypeReferenceNode(node)) {
                node.replaceWithText(getNewQualifiedname(node.getText()));
            }
            else if (ts_simple_ast_1.TypeGuards.isPropertyAccessExpression(node)) {
                node.replaceWithText(getNewQualifiedname(node.getText()));
            }
        });
        //store in hash table based on pathname key
        var reference = data[sourceFile.getFilePath()] = data[sourceFile.getFilePath()] || {};
        reference.sourceFile = sourceFile;
        reference.exportedCount = exportNames.length;
        reference.fullyQualifiedNamespace = namespace.getName();
        if (exportNames.length > 0) {
            reference.exportNames = exportNames.slice();
        }
        /*
             console.log(sourceFile.getFilePath() + " (namespace: "+ namespace.getName() + ")\n"
             + "exports: " + exportNames.length +" referenced count: "+ references.length);
          */
    }
});
// UPDATE FILES
/**************************************************************/
console.log("\n\n\n SECOND PASS - UPDATE SOURCE\n\n");
sourceFiles.forEach(function (sourceFile) {
    console.log(sourceFile.getFilePath());
    addImports(data[sourceFile.getFilePath()]);
    //removeNamespace(sourceFile)
});
console.log("\n\n\n SECOND PASS - remove namespace\n\n");
sourceFiles.forEach(function (sourceFile) {
    removeNamespace(sourceFile);
});
function addImports(item) {
    if (item)
        if (item.requires) {
            var allImports = [];
            var saveChanges = false;
            var _loop_1 = function () {
                var requiredItem = data[key];
                var importString = "";
                if (requiredItem.exportNames) {
                    modulePath = absoluteToRelativePath(requiredItem.sourceFile.getFilePath().slice(0, -3));
                    allImports = addToExportList(modulePath, requiredItem.exportNames, allImports);
                    saveChanges = true;
                    //debugging only
                    requiredItem.exportNames.forEach(function (e) {
                        importString += e + ", ";
                    });
                    importString = importString.slice(0, -2);
                    console.log('import {' + importString + '} from "' + modulePath + '"');
                    //end debugging.
                }
                else {
                    console.log('no imports');
                }
            };
            var modulePath;
            for (var key in item.requires) {
                _loop_1();
            }
            if (saveChanges) {
                item.sourceFile.addImports(allImports);
                item.sourceFile.save();
            }
        }
        else {
            console.log("sourcefile has no dependencies listed?");
        }
}
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
function removeNamespace(sourceFile) {
    while (sourceFile.getNamespaces().length > 0) {
        var currentNamespace = sourceFile.getNamespaces()[0];
        var name_1 = currentNamespace.getName();
        var namespaceBodyText = "\n\n// old namespace: " + name_1 + "\n\n" + currentNamespace.getBody().getChildSyntaxListOrThrow().getFullText();
        // replace the namespace with the body text
        sourceFile.replaceText([currentNamespace.getPos(), currentNamespace.getEnd()], namespaceBodyText);
    }
    sourceFile.formatText(); // make the text look nice
    console.log(sourceFile.getFilePath());
    sourceFile.save();
    //console.log(sourceFile.getFullText());
    //todo: add save
}
function absoluteToRelativePath(path) {
    return path.replace(basePath, "");
}
function getNewQualifiedname(old) {
    var o = old.split('.');
    var newName;
    newName = o[o.length - 1];
    /*
            if (o.length<=2){
                newName= o[o.length-1]
            }else{
                var firstBit = toCamelCase(o.slice(0,o.length-1));
                var lastBit = o[o.length-1];
                newName = firstBit+"."+lastBit;
            }
            
            console.log(old,newName);
      */
    return newName;
}
function toCamelCase(o) {
    var n;
    var capitalize = function (str) { return str.charAt(0).toUpperCase() + str.toLowerCase().slice(1); };
    for (var i = 0; i < o.length; i++) {
        if (i == 0)
            n = o[i];
        else
            n = n + capitalize(o[i]);
    }
    return n;
}
//# sourceMappingURL=cli.js.map