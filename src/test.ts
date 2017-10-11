import Ast, { SourceFile, TypeGuards, ImportDeclarationStructure}  from "ts-simple-ast";
import * as ts from "typescript";


const basePath="c:/Users/dmeag/Source/Repos/singletest/"

// start typescript compiler api helper
const ast = new Ast();

//add ts project
//ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
//ast.addSourceFiles("../test/VideoTour/**/*{.d.ts,.ts}");
ast.addSourceFiles("../singletest/test.ts");

const sourceFiles = ast.getSourceFiles();

console.log("\n------ start")



sourceFiles.forEach(function(sourceFile){

   // const propertyAccessExpressions = sourceFile.getDescendantsOfKind(ts.SyntaxKind.PropertyAccessExpression);
    const nodes = sourceFile.getDescendants();
    nodes.forEach(function(n){
        if (TypeGuards.isTypeReferenceNode(n)){
            console.log("TRN: getText="+n.getText());
        }else if (TypeGuards.isPropertyAccessExpression(n)){
            console.log("PAE: getText="+n.getText()+ " getName="+n.getName());
        }
    });
})

console.log("------ end")

function absoluteToRelativePath(path:string) : string {

    return path.replace(basePath,"");
}
