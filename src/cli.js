"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_ast_1 = require("ts-simple-ast");
var ts = require("typescript");
var ProgressBar = require("progress");
var ExportType;
(function (ExportType) {
    ExportType[ExportType["Single"] = 1] = "Single";
    ExportType[ExportType["Multiple"] = 2] = "Multiple";
})(ExportType || (ExportType = {}));
// todo: need to change requires from number to object containing another list of exportedNames
// 
// start typescript compiler api helper
var ast = new ts_simple_ast_1.default();
//add ts project
var basePath = "C:/Users/dmeag/Source/Repos/shout/FreeSurvey.Web.Mvc/";
ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/**/*{.d.ts,.ts}");
// const basePath="C:/Users/dmeag/Source/Repos/test/VideoTour/"
// ast.addSourceFiles("C:/Users/dmeag/Source/Repos/test/VideoTour/**/*{.d.ts,.ts}");
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
    if (isExcluded(sourceFile.getFilePath())) {
        //console.log("skipping: ",sourceFile.getFilePath())
    }
    else {
        var namespaces = sourceFile.getNamespaces();
        if (namespaces.length > 0) {
            //find namespace identifier (they are nested due to being fully qualified)
            var namespace = namespaces[0];
            var nameIdentifiers = namespace.getNameIdentifiers();
            var finalIdentifier = nameIdentifiers[nameIdentifiers.length - 1];
            //store in hash table based on pathname key
            var reference = data[sourceFile.getFilePath()] = data[sourceFile.getFilePath()] || { requires: [] };
            reference.sourceFile = sourceFile;
            reference.fullyQualifiedNamespace = namespace.getName();
            //loop through the statements, check for exports, get names and push them into an array for later.
            var exportNames = [];
            for (var _i = 0, _a = namespace.getStatements(); _i < _a.length; _i++) {
                var statement = _a[_i];
                if (!ts_simple_ast_1.TypeGuards.isExportableNode(statement) || !statement.hasExportKeyword())
                    continue;
                if (ts_simple_ast_1.TypeGuards.isVariableStatement(statement)) {
                    for (var _b = 0, _c = statement.getDeclarationList().getDeclarations(); _b < _c.length; _b++) {
                        var variableDeclaration = _c[_b];
                        //console.log("Variable: ",variableDeclaration.getName());
                        exportNames.push(variableDeclaration.getName());
                        refactorNames(variableDeclaration.getNameIdentifier(), sourceFile, variableDeclaration.getName());
                    }
                }
                else if (ts_simple_ast_1.TypeGuards.isNamedNode(statement)) {
                    //console.log("Named Node: ",statement.getName());
                    exportNames.push(statement.getName());
                    refactorNames(statement.getNameIdentifier(), sourceFile, statement.getName());
                }
                else
                    console.error("Unhandled exported statement: " + statement.getText());
            }
            reference.exportedCount = exportNames.length;
            if (exportNames.length > 0) {
                reference.exportNames = exportNames.slice();
            }
            /*
                    console.log(sourceFile.getFilePath() + " (namespace: "+ namespace.getName() + ")\n"
                    + "exports: " + exportNames.length +" referenced count: "+ references.length);
                */
        }
    }
});
//console.log("**** Finished ****")
if (1) {
    // UPDATE FILES
    /**************************************************************/
    console.log("\n\n\n SECOND PASS - UPDATE SOURCE\n\n");
    sourceFiles.forEach(function (sourceFile) {
        if (isExcluded(sourceFile.getFilePath())) {
            console.log("skipping: ", sourceFile.getFilePath());
        }
        else {
            console.log(sourceFile.getFilePath());
            addImports(data[sourceFile.getFilePath()]);
        }
        //removeNamespace(sourceFile)
    });
    console.log("\n\n\n SECOND PASS - remove namespace\n\n");
    sourceFiles.forEach(function (sourceFile) {
        if (isExcluded(sourceFile.getFilePath())) {
            console.log("skipping: ", sourceFile.getFilePath());
        }
        else {
            console.log(sourceFile.getFilePath());
            removeNamespace(sourceFile);
        }
    });
}
function isExcluded(fileyMcFileFace) {
    if (!(fileyMcFileFace.indexOf("node_modules") == -1 &&
        fileyMcFileFace.indexOf("wwwroot/") == -1 &&
        fileyMcFileFace.indexOf("bower_components/") == -1 &&
        fileyMcFileFace.indexOf("Scripts/typings/") == -1)) {
        return true;
    }
}
function refactorNames(finalIdentifier, sourceFile, thingName) {
    //find references
    var referencedSymbols = finalIdentifier.findReferences();
    var references = referencedSymbols[0].getReferences(); // probably not unique, needs to check by scriptname
    references.forEach(function (element) {
        var referenceSourceFile = element.getSourceFile();
        var referenceSourceFilePath = referenceSourceFile.getFilePath();
        var refModule = absoluteToRelativePath(referenceSourceFilePath);
        var refLastModuleIdentifier = referenceSourceFile.getNamespaces()[0].getName();
        if (!data[referenceSourceFilePath]) {
            data[referenceSourceFilePath] = {
                sourceFile: referenceSourceFile,
                requires: []
            };
        }
        if (referenceSourceFilePath != sourceFile.getFilePath()) {
            if (!data[referenceSourceFilePath].requires[sourceFile.getFilePath()])
                data[referenceSourceFilePath].requires[sourceFile.getFilePath()] = [];
            data[referenceSourceFilePath].requires[sourceFile.getFilePath()][thingName] = null;
            var node = element.getNode();
            var parent_1 = node.getParent();
            var parentKind = parent_1.getKind();
            if (parentKind != ts.SyntaxKind.QualifiedName &&
                parentKind != ts.SyntaxKind.TypeReference &&
                parentKind != ts.SyntaxKind.PropertyAccessExpression) {
                //don't change
                //console.log("nochange: ", refModule, node.getKindName(), node.getText());
            }
            else {
                var newName;
                if (checkForDuplicateReferenceIdentifier(data[referenceSourceFilePath], sourceFile.getFilePath(), thingName)) {
                    //console.log("********duplicate**********",thingName)
                    var splitName = parent_1.getText().split(".");
                    var name = splitName.splice(splitName.length - 2);
                    if (name.length == 1) {
                        //since the name has no preceeding namespace we need to get an identifier from somewhere else.
                        name.unshift(refLastModuleIdentifier.split('.').slice(-1)[0]);
                    }
                    newName = data[referenceSourceFilePath].requires[sourceFile.getFilePath()][thingName]
                        = toCamelCase(name);
                }
                else {
                    newName = getNewQualifiedname(parent_1.getText());
                }
                //console.log("found:",  refModule,parent.getKindName(), parent.getText(),"replace with: "+newName);
                var parentyMcParent = parent_1.getParent();
                var parentyMcParentKind = parentyMcParent.getKind();
                if (parent_1.getText().split('.')[0] != thingName) {
                    if (parent_1.getText().split('<')[0].trim() != thingName) {
                        parent_1.replaceWithText(newName);
                        referenceSourceFile.save();
                    }
                }
            }
        }
    });
}
function checkForDuplicateReferenceIdentifier(fileData, sourceFilePath, thingName) {
    var found;
    for (var includeFile in fileData.requires) {
        if (includeFile != sourceFilePath)
            for (var name in fileData.requires[includeFile]) {
                //console.log(name)            
                if (name == thingName) {
                    found = true;
                    //console.log("#################### found", includeFile,fileData.sourceFile.getFilePath())                        
                }
            }
    }
    ;
    return found;
}
function getKeys(array) {
    var keys = [];
    for (var key in array) {
        if (array[key]) {
            keys.push(array[key]);
        }
        else {
            keys.push(key);
        }
    }
    return keys;
}
function addImports(item) {
    if (item) {
        if (item.requires) {
            var allImports = [];
            var saveChanges = false;
            var _loop_1 = function () {
                var requiredItem = data[key];
                var importString = "";
                if (requiredItem.exportNames) {
                    modulePath = absoluteToRelativePath(requiredItem.sourceFile.getFilePath().slice(0, -3));
                    allImports = addToExportList(modulePath, item.requires[requiredItem.sourceFile.getFilePath()], allImports);
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
            }
        }
        else {
            console.log("sourcefile has no dependencies listed?");
        }
        var angularImportDeclaration = {
            moduleSpecifier: "angular",
            namespaceImport: 'angular'
        };
        item.sourceFile.addImport(angularImportDeclaration);
        item.sourceFile.save();
    }
}
function addToExportList(moduleSpecifier, exportNames, allImports) {
    var addExportList = [];
    var importDeclaration = {
        moduleSpecifier: moduleSpecifier,
        namedImports: []
    };
    for (var i in exportNames) {
        if (exportNames[i]) {
            importDeclaration.namedImports.push({ name: i, alias: exportNames[i] });
        }
        else {
            importDeclaration.namedImports.push({ name: i });
        }
    }
    allImports.push(importDeclaration);
    return allImports;
}
function removeNamespace(sourceFile) {
    while (sourceFile.getNamespaces().length > 0) {
        var currentNamespace = sourceFile.getNamespaces()[0];
        var name_1 = currentNamespace.getName();
        currentNamespace.unwrap();
        //const namespaceBodyText = "\n\n// old namespace: " + name + "\n\n"+ currentNamespace.getBody().getChildSyntaxListOrThrow().getFullText();
        // replace the namespace with the body text
        //sourceFile.replaceText([currentNamespace.getPos(), currentNamespace.getEnd()], namespaceBodyText);
    }
    //sourceFile.formatText(); // make the text look nice
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
    var capitalize = function (str) { return str.charAt(0).toUpperCase() + str.slice(1); };
    for (var i = 0; i < o.length; i++) {
        if (i == 0)
            n = o[i];
        else
            n = n + capitalize(o[i]);
    }
    return n;
}
//# sourceMappingURL=cli.js.map