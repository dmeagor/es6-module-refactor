import Ast, { SourceFile, TypeGuards, ImportDeclarationStructure, Identifier}  from "ts-simple-ast";
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
const basePath="C:/Users/dmeag/Source/Repos/test/VideoTour/"
ast.addSourceFiles("C:/Users/dmeag/Source/Repos/test/VideoTour/**/*{.d.ts,.ts}");

const sourceFiles = ast.getSourceFiles();

console.log("\nAnalysing source files for dependencies")
var bar = new ProgressBar('[:bar] ETA :eta seconds ...:filename', { total: sourceFiles.length, width: 40 });

var data: FileData[] = [];


//FIRST PASS - ANALYSE LOOP.  Populate FileData object
/**********************************************************/

sourceFiles.forEach(function(sourceFile){
    console.log("\nstart:"+sourceFile.getFilePath());
    bar.tick({filename: sourceFile.getFilePath().slice(-100)});
    bar.render();

    var namespaces = sourceFile.getNamespaces();
    if (namespaces.length > 0) {
        
        //find namespace identifier (they are nested due to being fully qualified)
        var namespace = namespaces[0];
        var nameIdentifiers = namespace.getNameIdentifiers();
        var finalIdentifier = nameIdentifiers[nameIdentifiers.length-1];

        


        //loop through the statements, check for exports, get names and push them into an array for later.
        const exportNames = [];
                        
        for (const statement of namespace.getStatements()) {
            if (!TypeGuards.isExportableNode(statement) || !statement.hasExportKeyword())
                continue;
        
            if (TypeGuards.isVariableStatement(statement)) {
                for (const variableDeclaration of statement.getDeclarationList().getDeclarations()) {
                    console.log("Variable: ",variableDeclaration.getName());
                    exportNames.push(variableDeclaration.getName());
                    refactorNames(variableDeclaration.getNameIdentifier(),sourceFile);
                }
            }
            else if (TypeGuards.isNamedNode(statement)){
                console.log("Named Node: ",statement.getName());
                
                exportNames.push(statement.getName());
                refactorNames(statement.getNameIdentifier(),sourceFile);                
            }
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

if (0){
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

}

function refactorNames(finalIdentifier : Identifier, sourceFile : SourceFile){
    //find references
    const referencedSymbols = finalIdentifier.findReferences();
    var references = referencedSymbols[0].getReferences() // probably not unique, needs to check by scriptname

    references.forEach(element => {      

        let referenceSourceFile = element.getSourceFile();
        let referenceSourceFilePath = referenceSourceFile.getFilePath();                        
        let refModule = absoluteToRelativePath(referenceSourceFilePath);

        if (!data[referenceSourceFilePath]){
            data[referenceSourceFilePath] = {
                sourceFile: referenceSourceFile,
                requires: []
            }
        }
        
        if (referenceSourceFilePath!=sourceFile.getFilePath()){
            data[referenceSourceFilePath].requires[sourceFile.getFilePath()]=1;                
        }
        
        
        var node=element.getNode();
        let parentKind=node.getParent().getKind();
        
        if (parentKind!=ts.SyntaxKind.QualifiedName &&
            parentKind!=ts.SyntaxKind.TypeReference && 
            parentKind!=ts.SyntaxKind.PropertyAccessExpression ){
            
            //don't change
            console.log("nochange: ", refModule, node.getKindName(), node.getText());
            
        } else {


            
            const node = element.getNode(); // this should be the identifier... previously it was a bug fixed in #106
            


            const qn = node.getParentWhileKind(ts.SyntaxKind.QualifiedName);
            const pae = node.getParentWhileKind(ts.SyntaxKind.PropertyAccessExpression);
            const tr = node.getParentWhileKind(ts.SyntaxKind.TypeReference);
            let found=false;

            if (pae != null){
                let left = pae.getChildrenOfKind(ts.SyntaxKind.Identifier)[0];
                if (left)
                    console.log("pae: ",  refModule, pae.getKindName(), pae.getText(), left.getText());
                else
                    console.log("pae: ",  refModule, pae.getKindName(), pae.getText());            
                found=true;
            }
            
            if (tr != null){
                console.log("tr1: ",  refModule, tr.getKindName(), tr.getText());  
                found = true;
                
            }else if (qn != null){

                const tr2 = qn.getParentWhileKind(ts.SyntaxKind.TypeReference);
                console.log("tr2: ",  refModule, tr2.getKindName(), tr2.getText());  
                
                found = true;
                
            }
            
            if (!found){
                console.log("*** error: ",  refModule,node.getKindName(), node.getParent().getKindName(),node.getText() );
            }

            
            //ancestor2.replaceWithText(getNewQualifiedname(ancestor2.getText()))                                  
            //referenceSourceFile.save();
        }
    });
}

function addImports(item: FileData){
    if (item)
        if (item.requires){
            var allImports : ImportDeclarationStructure[] = [];
            let saveChanges = false;
            for (var key in item.requires){
                let requiredItem = data[key];
                let importString = "";
                if (requiredItem.exportNames){
                    var modulePath=absoluteToRelativePath(requiredItem.sourceFile.getFilePath().slice(0, -3));
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

function absoluteToRelativePath(path:string) : string {
    
        return path.replace(basePath,"");
}

function getNewQualifiedname(old:string){
    
        var o : string[] = old.split('.');
        var newName: string;
    
        newName= o[o.length-1]
        
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
    
    
    function toCamelCase(o: string[]){
        var n:string;
        const capitalize = str => str.charAt(0).toUpperCase() + str.toLowerCase().slice(1)    
    
        for(var i=0;i<o.length;i++){
            if (i==0) 
                n=o[i];
            else 
                n=n+capitalize(o[i]);
        }
        return n
    }