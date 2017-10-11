import Ast, { SourceFile, TypeGuards, ImportDeclarationStructure}  from "ts-simple-ast";
import * as _ from "underscore";
import * as ts from "typescript";
import * as ProgressBar from "progress";


enum ExportType{
    Single=1,
    Multiple=2
}

interface FileData{
    sourceFile?: SourceFile,
    fullyQualifiedNamespace?:string,    
    exportedCount?:number,   
    exportType?:ExportType,
    exportNames?:string[],
    requires?:number[]
}



// start typescript compiler api helper
const ast = new Ast();

//add ts project
//ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
ast.addSourceFiles("../test/VideoTour/**/*{.d.ts,.ts}");

const sourceFiles = ast.getSourceFiles();

console.log("\nAnalysing source files for dependencies")
var bar = new ProgressBar('[:bar] ETA :eta seconds ...:filename', { total: sourceFiles.length, width: 40 });

var data: FileData[] = [];


//FIRST PASS - ANALYSE LOOP.  Populate FileData object
/**********************************************************/

sourceFiles.forEach(function(sourceFile){
    //console.log("\nstart:"+sourceFile.getFilePath());
    bar.tick({filename: sourceFile.getFilePath().slice(-100)});
    bar.render();

    var namespaces = sourceFile.getNamespaces();
    if (namespaces.length > 0) {
        
        //find namespace identifier (they are nested due to being fully qualified)
        var namespace = namespaces[0];
        var nameIdentifiers = namespace.getNameIdentifiers();
        var finalIdentifier = nameIdentifiers[nameIdentifiers.length-1];

        //find references
        const referencedSymbols = finalIdentifier.findReferences();
        var references = referencedSymbols[0].getReferences() // probably not unique, needs to check by scriptname

        references.forEach(element => {
            let referenceSourceFile = element.getSourceFile();
            let referenceSourceFilePath = referenceSourceFile.getFilePath();                        

            if (!data[referenceSourceFilePath]){
                data[referenceSourceFilePath] = {
                    sourceFile: referenceSourceFile,
                    requires: []
                }
            }
            
            if (referenceSourceFilePath!=sourceFile.getFilePath()){
                data[referenceSourceFilePath].requires[sourceFile.getFilePath()]=1;                
            }

            //console.log("--->"+referenceSourceFilePath);
        });


        //loop through the statements, check for exports, get names and push them into an array for later.
        const exportNames = [];
                        
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


        //store in hash table based on pathname key
        const reference : FileData = data[sourceFile.getFilePath()] = data[sourceFile.getFilePath()] || {};
        
        reference.sourceFile = sourceFile;
        reference.exportedCount = exportNames.length;
        reference.fullyQualifiedNamespace = namespace.getName();
        if (exportNames.length>0){
            reference.exportNames=exportNames.slice();
        }
        
   /*     
        console.log(sourceFile.getFilePath() + " (namespace: "+ namespace.getName() + ")\n"
        + "exports: " + exportNames.length +" referenced count: "+ references.length);
     */   
            
    }

})


// UPDATE FILES
/**************************************************************/

console.log("\n\n\n SECOND PASS - UPDATE SOURCE\n\n");

sourceFiles.forEach(function(sourceFile){
    console.log(sourceFile.getFilePath());
    addImports(data[sourceFile.getFilePath()]);

    //removeNamespace(sourceFile)
});

console.log("\n\n\n SECOND PASS - remove namespace\n\n");

sourceFiles.forEach(function(sourceFile){

    removeNamespace(sourceFile)
});

function addImports(item: FileData){
    if (item)
        if (item.requires){
            var allImports : ImportDeclarationStructure[] = [];
            let saveChanges = false;
            for (var key in item.requires){
                let requiredItem = data[key];
                let importString = "";
                if (requiredItem.exportNames){
                    var modulePath=requiredItem.sourceFile.getFilePath().slice(0, -3);;
                    allImports = addToExportList(modulePath,requiredItem.exportNames,allImports);
                    saveChanges=true;
                    //debugging only
                    requiredItem.exportNames.forEach(function(e){
                        importString += e + ", ";
                    })
                    importString = importString.slice(0, -2);
                    console.log('import {'+importString+'} from "'+modulePath+'"');
                    //end debugging.
                    
                }else{
                    console.log('no imports');
                }
                
            }
            if (saveChanges){
                item.sourceFile.addImports(allImports);            
                item.sourceFile.save();
            }
        }else{
            console.log("sourcefile has no dependencies listed?")
        }

}

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


function removeNamespace(sourceFile){

    while (sourceFile.getNamespaces().length > 0) {
        const currentNamespace = sourceFile.getNamespaces()[0];
        const name = currentNamespace.getName();
        const namespaceBodyText = "\n\n// old namespace: " + name + "\n\n"+ currentNamespace.getBody().getChildSyntaxListOrThrow().getFullText();
        
        // replace the namespace with the body text
        sourceFile.replaceText([currentNamespace.getPos(), currentNamespace.getEnd()], namespaceBodyText);
    }

    sourceFile.formatText(); // make the text look nice
    console.log(sourceFile.getFilePath());
    sourceFile.save();
    //console.log(sourceFile.getFullText());
    //todo: add save
}