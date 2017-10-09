import Ast, { SourceFile } from "ts-simple-ast";
import * as _ from "underscore";
import * as ts from "typescript";


// start typescript compiler api helper
const ast = new Ast();

//add ts project
ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
const sourceFiles = ast.getSourceFiles();

enum ExportType{
    Single=1,
    Multiple=2
}

interface FileData{
    sourceFile?: SourceFile,
    fullyQualifiedNamespace?:string,    
    exportedClassCount?:number,
    exportedInterfaceCount?:number,
    exportedOtherCount?:number,
    exportedTotalCount?:number,
    exportType?:ExportType,
    exportNames?:string[],
    requires?:number[]
}

var data: FileData[] = [];


//FIRST PASS - ANALYSE LOOP.  Populate FileData object
/**********************************************************/

sourceFiles.forEach(function(sourceFile){
    console.log("\nstart:"+sourceFile.getFilePath());

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

            console.log("--->"+referenceSourceFilePath);
        });
  

        //need to know how many exported thingys there are so singles can be defaulted

        var exportedClassCount = 0;
        var exportedInterfaceCount = 0;
        var exportedTotalCount = 0;        
        var exportNames = [];

        namespace.getClasses().forEach(function(c){
            if (c.isNamedExport){
                exportedClassCount++;
                exportNames.push(c.getName());
            }
        });

        var exportedInterfaceCount = 0;
        namespace.getInterfaces().forEach(function(c){
            if (c.isNamedExport){
                exportedInterfaceCount++;
                exportNames.push(c.getName());
            }
        });

        namespace.getDescendantsOfKind(ts.SyntaxKind.ExportKeyword).forEach(function(c){
            exportedTotalCount++;
            exportNames.push(c.);  //getname is not valid in this case.
        });
        
        var exportedOtherCount = exportedTotalCount-exportedClassCount-exportedInterfaceCount;
        

        //store in hash table based on pathname key
        const reference :FileData = data[sourceFile.getFilePath()] = data[sourceFile.getFilePath()] || {};
        
        reference.sourceFile = sourceFile;
        reference.exportedClassCount = exportedClassCount;
        reference.exportedInterfaceCount = exportedInterfaceCount;
        reference.exportedOtherCount = exportedOtherCount;
        reference.exportedTotalCount = exportedTotalCount;
        reference.fullyQualifiedNamespace = namespace.getName();
        if (exportNames.length>0){
            reference.exportNames=exportNames.slice();
        }



        
        console.log(sourceFile.getFilePath() + "(namespace: "+ namespace.getName() + ")\n"
        + "Exported Class: " + exportedClassCount + " Interface: " + exportedInterfaceCount + " Other: " + exportedOtherCount +" referenced count: "+ references.length);
    



        //todo: Search graph and add import statements
        addImports(data[sourceFile.getFilePath()]);

            
    }

})


// UPDATE FILES
/**************************************************************/

console.log("\n\n\n SECOND PASS - UPDATE SOURCE\n\n");

sourceFiles.forEach(function(sourceFile){
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

function addImports(item: FileData){

    for (var key in item.requires){
        let requiredItem = data[key];
        let importString = "";
        if (requiredItem.exportNames){
            requiredItem.exportNames.forEach(function(e){
                importString += e + ", ";
            })
            importString = importString.slice(0, -2);

            console.log('import {'+importString+'} from "'+requiredItem.sourceFile.getFilePath())+'"');
        }else{
            console.log('no imports');
        }
    }
}


function removeNamespace(sourceFile){

    while (sourceFile.getNamespaces().length > 0) {
        const currentNamespace = sourceFile.getNamespaces()[0];
        const name = currentNamespace.getName();
        const namespaceBodyText = "// old namespace: " + name + "\n\n"+ currentNamespace.getBody().getChildSyntaxListOrThrow().getFullText();
        
        // replace the namespace with the body text
        sourceFile.replaceText([currentNamespace.getPos(), currentNamespace.getEnd()], namespaceBodyText);
    }

    sourceFile.formatText(); // make the text look nice
    console.log(sourceFile.getFullText());
    //todo: add save
}