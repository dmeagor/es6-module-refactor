import Ast from "ts-simple-ast";
import * as _ from "underscore";
var Graph = require("graph-data-structure");


// start typescript compiler api helper
const ast = new Ast();

//add ts project
ast.addSourceFiles("C:/Users/dmeag/Source/Repos/shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
const sourceFiles = ast.getSourceFiles();



//go through each file in the project and build a graph data structure linking all of the files dependencies together so that we can work out what modules need to be imported
var graph = new Graph();
sourceFiles.forEach(function(sourceFile){
    console.log(sourceFile.getFilePath())
    
    var namespaces = sourceFile.getNamespaces();
    if (namespaces.length > 0) {
        
        //find namespace identifier (they are nested due to being fully qualified)
        var namespace = namespaces[0];
        var nameIdentifiers = namespace.getNameIdentifiers();
        var finalIdentifier = nameIdentifiers[nameIdentifiers.length-1];

        //find references
        const referencedSymbols = finalIdentifier.findReferences();
        var references = referencedSymbols[0].getReferences() // probably not unique, needs to check by scriptname

        //Nerding the shit out of this with a graph data structure
        graph.addEdge(sourceFile.getFilePath(),references[0].getSourceFile().getFilePath());
        
        //need to know how many exported thingys there are so singles can be defaulted

        var exportCount = 0;
        namespace.getClasses().forEach(function(c){
            if (c.isNamedExport) exportCount++;
        });

        console.log("namespace: "+ namespace.getName() + " exports:" + exportCount + " referenced count: "+ references.length);
    

        //todo: add export default if possible

        //todo: Search graph and add import statements

        // remove the legacy namespaces
        //removeNamespace(sourceFile)
    
    }
    
        
})




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