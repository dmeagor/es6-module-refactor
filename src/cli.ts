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
    requires?: IRequires[]
}

export interface IRequires {
    [index: string]: string;
}

// todo: need to change requires from number to object containing another list of exportedNames
// 

// start typescript compiler api helper
const ast = new Ast();

//add ts project
// const basePath="c:/Users/dmeag/Source/Repos/shout/FreeSurvey.Web.Mvc/"
// ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/**/*{.d.ts,.ts}");
const basePath="C:/Users/dmeag/Source/Repos/test/VideoTour/"
ast.addSourceFiles("C:/Users/dmeag/Source/Repos/test/VideoTour/**/*{.d.ts,.ts}");

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

    if (isExcluded(sourceFile.getFilePath()) )
    {
        //console.log("skipping: ",sourceFile.getFilePath())
    }else{
        var namespaces = sourceFile.getNamespaces();
        if (namespaces.length > 0) {
            
            //find namespace identifier (they are nested due to being fully qualified)
            var namespace = namespaces[0];
            var nameIdentifiers = namespace.getNameIdentifiers();
            var finalIdentifier = nameIdentifiers[nameIdentifiers.length-1];

            //store in hash table based on pathname key
            const reference : FileData = data[sourceFile.getFilePath()] = data[sourceFile.getFilePath()] || { requires: [] };
            reference.sourceFile = sourceFile;
            reference.fullyQualifiedNamespace = namespace.getName();
            


            //loop through the statements, check for exports, get names and push them into an array for later.
            const exportNames = [];
                            
            for (const statement of namespace.getStatements()) {
                if (!TypeGuards.isExportableNode(statement) || !statement.hasExportKeyword())
                    continue;
            
                if (TypeGuards.isVariableStatement(statement)) {
                    for (const variableDeclaration of statement.getDeclarationList().getDeclarations()) {
                        //console.log("Variable: ",variableDeclaration.getName());
                        exportNames.push(variableDeclaration.getName());
                        refactorNames(variableDeclaration.getNameIdentifier(),sourceFile,variableDeclaration.getName());
                    }
                }
                else if (TypeGuards.isNamedNode(statement)){
                    //console.log("Named Node: ",statement.getName());
                    
                    exportNames.push(statement.getName());
                    refactorNames(statement.getNameIdentifier(),sourceFile,statement.getName());                
                }
                else
                    console.error(`Unhandled exported statement: ${statement.getText()}`);
            }

                
            reference.exportedCount = exportNames.length;
            if (exportNames.length>0){
                reference.exportNames=exportNames.slice();
            }
            
    /*     
            console.log(sourceFile.getFilePath() + " (namespace: "+ namespace.getName() + ")\n"
            + "exports: " + exportNames.length +" referenced count: "+ references.length);
        */   
                
        }
    }

})

//console.log("**** Finished ****")
if (1){
// UPDATE FILES
/**************************************************************/

console.log("\n\n\n SECOND PASS - UPDATE SOURCE\n\n");

sourceFiles.forEach(function(sourceFile){

    if (isExcluded(sourceFile.getFilePath()))
    {
        console.log("skipping: ",sourceFile.getFilePath())
    }else{
        console.log(sourceFile.getFilePath());
        addImports(data[sourceFile.getFilePath()]);
    }
    //removeNamespace(sourceFile)
});

console.log("\n\n\n SECOND PASS - remove namespace\n\n");

sourceFiles.forEach(function(sourceFile){
    if (isExcluded(sourceFile.getFilePath()))
    {
        console.log("skipping: ",sourceFile.getFilePath())
    }else{
        console.log(sourceFile.getFilePath());    
        removeNamespace(sourceFile)
    }
});

}

function isExcluded(fileyMcFileFace:string){
    if (!(fileyMcFileFace.indexOf("node_modules") == -1 &&
        fileyMcFileFace.indexOf("wwwroot/") == -1 &&
        fileyMcFileFace.indexOf("bower_components/") == -1 &&
        fileyMcFileFace.indexOf("Scripts/typings/") == -1)
    ){return true}

}


function refactorNames(finalIdentifier : Identifier, sourceFile : SourceFile, thingName:string){
    //find references
    const referencedSymbols = finalIdentifier.findReferences();
    var references = referencedSymbols[0].getReferences() // probably not unique, needs to check by scriptname

    

    references.forEach(element => {      

        let referenceSourceFile = element.getSourceFile();
        let referenceSourceFilePath = referenceSourceFile.getFilePath();                        
        let refModule = absoluteToRelativePath(referenceSourceFilePath);    
        const refLastModuleIdentifier = referenceSourceFile.getNamespaces()[0].getName();

        if (!data[referenceSourceFilePath]){
            data[referenceSourceFilePath] = {
                sourceFile: referenceSourceFile,
                requires: []
            }
        }


        
        if (referenceSourceFilePath!=sourceFile.getFilePath()){
            if(!data[referenceSourceFilePath].requires[sourceFile.getFilePath()])
                data[referenceSourceFilePath].requires[sourceFile.getFilePath()] = [];  

            data[referenceSourceFilePath].requires[sourceFile.getFilePath()][thingName] = null;                                        
            
       
        

        
            var node=element.getNode();
            
            let parent = node.getParent();
            let parentKind=parent.getKind();

            if (parentKind!=ts.SyntaxKind.QualifiedName &&
                parentKind!=ts.SyntaxKind.TypeReference && 
                parentKind!=ts.SyntaxKind.PropertyAccessExpression ){
                
                //don't change
                //console.log("nochange: ", refModule, node.getKindName(), node.getText());
                
            } else {
                var newName:string;                

                if(checkForDuplicateReferenceIdentifier(data[referenceSourceFilePath], sourceFile.getFilePath(),thingName)){
                    //console.log("********duplicate**********",thingName)
                    var splitName = parent.getText().split(".");
                    var name = splitName.splice(splitName.length-2);
                    if (name.length==1) {
                        //since the name has no preceeding namespace we need to get an identifier from somewhere else.
                        name.unshift(refLastModuleIdentifier.split('.').slice(-1)[0]);
                    }
                    newName = data[referenceSourceFilePath].requires[sourceFile.getFilePath()][thingName] 
                        = toCamelCase(name);                        
                }else{
                    newName = getNewQualifiedname(parent.getText())
                }


                //console.log("found:",  refModule,parent.getKindName(), parent.getText(),"replace with: "+newName);

                let parentyMcParent = parent.getParent();
                let parentyMcParentKind=parentyMcParent.getKind();
                
                if (parent.getText().split('.')[0]!=thingName){
                    if (parent.getText().split('<')[0].trim()!=thingName){
                        parent.replaceWithText(newName)                                  
                        referenceSourceFile.save();
                    }
                }
            }
        }
    });

}


function checkForDuplicateReferenceIdentifier(fileData :FileData, sourceFilePath: string, thingName: string){

    let found;    

    for (var includeFile in fileData.requires){
        if (includeFile!=sourceFilePath)
        for (var name in fileData.requires[includeFile]){
       
            //console.log(name)            
            
            if(name == thingName){        
                found = true;
                //console.log("#################### found", includeFile,fileData.sourceFile.getFilePath())                        
            }

        }
    };

    return found;
}

function getKeys(array: any[]): string[] {
    const keys = [];

    for(var key in array){
        if (array[key]){
            keys.push(array[key]);
        }else{
            keys.push(key);
        }
    }

    return keys;
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
                    allImports = addToExportList(modulePath,item.requires[requiredItem.sourceFile.getFilePath()],allImports);
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
            }
        }else{
            console.log("sourcefile has no dependencies listed?")
        }
        var angularImportDeclaration : ImportDeclarationStructure = {
            moduleSpecifier: "angular",
            namespaceImport: 'angular'
        }
        item.sourceFile.addImport(angularImportDeclaration);            
        item.sourceFile.save();

}

function addToExportList(moduleSpecifier : string, exportNames : string[], allImports: ImportDeclarationStructure[]) : ImportDeclarationStructure[]{
    var addExportList = [];
        
    var importDeclaration : ImportDeclarationStructure = {
        moduleSpecifier: moduleSpecifier,
        namedImports: []
    }
    
    for (var i in exportNames) {
        if (exportNames[i]){
            importDeclaration.namedImports.push({name: i, alias: exportNames[i]});            
        }
        else{
            importDeclaration.namedImports.push({name: i});            
        }
    }
    
    allImports.push(importDeclaration);
    
    return allImports;
}


function removeNamespace(sourceFile){

    while (sourceFile.getNamespaces().length > 0) {
        const currentNamespace = sourceFile.getNamespaces()[0];
        const name = currentNamespace.getName();
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
        const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1)    
    
        for(var i=0;i<o.length;i++){
            if (i==0) 
                n=o[i];
            else 
                n=n+capitalize(o[i]);
        }
        return n
    }