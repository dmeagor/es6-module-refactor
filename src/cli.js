"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts_simple_ast_1 = require("ts-simple-ast");
var ts = require("typescript");
// start typescript compiler api helper
var ast = new ts_simple_ast_1.default();
//add ts project
ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
var sourceFiles = ast.getSourceFiles();
var ExportType;
(function (ExportType) {
    ExportType[ExportType["Single"] = 1] = "Single";
    ExportType[ExportType["Multiple"] = 2] = "Multiple";
})(ExportType || (ExportType = {}));
var data = [];
//FIRST PASS - ANALYSE LOOP.  Populate FileData object
/**********************************************************/
sourceFiles.forEach(function (sourceFile) {
    console.log("\nstart:" + sourceFile.getFilePath());
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
            console.log("--->" + referenceSourceFilePath);
        });
        //need to know how many exported thingys there are so singles can be defaulted
        var exportedClassCount = 0;
        var exportedInterfaceCount = 0;
        var exportedTotalCount = 0;
        var exportNames = [];
        namespace.getClasses().forEach(function (c) {
            if (c.isNamedExport) {
                exportedClassCount++;
                exportNames.push(c.getName());
            }
        });
        var exportedInterfaceCount = 0;
        namespace.getInterfaces().forEach(function (c) {
            if (c.isNamedExport) {
                exportedInterfaceCount++;
                exportNames.push(c.getName());
            }
        });
        namespace.getDescendantsOfKind(ts.SyntaxKind.ExportKeyword).forEach(function (c) {
            exportedTotalCount++;
            exportNames.push(c.); //getname is not valid in this case.
        });
        var exportedOtherCount = exportedTotalCount - exportedClassCount - exportedInterfaceCount;
        //store in hash table based on pathname key
        var reference = data[sourceFile.getFilePath()] = data[sourceFile.getFilePath()] || {};
        reference.sourceFile = sourceFile;
        reference.exportedClassCount = exportedClassCount;
        reference.exportedInterfaceCount = exportedInterfaceCount;
        reference.exportedOtherCount = exportedOtherCount;
        reference.exportedTotalCount = exportedTotalCount;
        reference.fullyQualifiedNamespace = namespace.getName();
        if (exportNames.length > 0) {
            reference.exportNames = exportNames.slice();
        }
        console.log(sourceFile.getFilePath() + "(namespace: " + namespace.getName() + ")\n"
            + "Exported Class: " + exportedClassCount + " Interface: " + exportedInterfaceCount + " Other: " + exportedOtherCount + " referenced count: " + references.length);
        //todo: Search graph and add import statements
        addImports(data[sourceFile.getFilePath()]);
    }
});
// UPDATE FILES
/**************************************************************/
console.log("\n\n\n SECOND PASS - UPDATE SOURCE\n\n");
sourceFiles.forEach(function (sourceFile) {
    console.log(sourceFile.getFilePath());
    //removeNamespace(sourceFile)
    //setExportDefault(data[sourceFile.getFilePath()]);
});
/*

function setExportDefault(item: FileData){
    console.log("setExportDefault:"+item.sourceFile.getFilePath());
    var namespaces = item.sourceFile.getNamespaces();
    if (namespaces.length > 0) {
        var namespace = namespaces[0];
        
        if (item.exportedTotalCount==1){
            item.exportType = ExportType.Single;
            
            if (item.exportedClassCount==1){
                let n = namespace.getClasses()[0];
                item.exportName = n.getName();
                n.setIsDefaultExport(true);
            }
            if (item.exportedInterfaceCount==1){
                let n = namespace.getInterfaces()[0];
                item.exportName = n.getName();
                n.setIsDefaultExport(true);
            }
            if (item.exportedOtherCount==1){
                namespace.getDescendantsOfKind(ts.SyntaxKind.ExportKeyword).forEach(function(c){
                //hard one.
                });
                
                //todo:
                //item.sourceFile.insertExport(item.sourceFile.getEnd(),{});
            }

        }
    }
    console.log("setExportDefault: end");
     
}

*/
function addImports(item) {
    var _loop_1 = function () {
        var requiredItem = data[key];
        var importString = "";
        if (requiredItem.exportNames) {
            requiredItem.exportNames.forEach(function (e) {
                importString += e + ", ";
            });
            importString = importString.slice(0, -2);
            console.log('import {' + importString + '} from "' + requiredItem.sourceFile.getFilePath()) + '"';
            ;
        }
        else {
            console.log('no imports');
        }
    };
    for (var key in item.requires) {
        _loop_1();
    }
}
function removeNamespace(sourceFile) {
    while (sourceFile.getNamespaces().length > 0) {
        var currentNamespace = sourceFile.getNamespaces()[0];
        var name_1 = currentNamespace.getName();
        var namespaceBodyText = "// old namespace: " + name_1 + "\n\n" + currentNamespace.getBody().getChildSyntaxListOrThrow().getFullText();
        // replace the namespace with the body text
        sourceFile.replaceText([currentNamespace.getPos(), currentNamespace.getEnd()], namespaceBodyText);
    }
    sourceFile.formatText(); // make the text look nice
    console.log(sourceFile.getFullText());
    //todo: add save
}
//# sourceMappingURL=cli.js.map