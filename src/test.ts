import Ast, { SourceFile, TypeGuards, ImportDeclarationStructure}  from "ts-simple-ast";
import * as ts from "typescript";



// start typescript compiler api helper
const ast = new Ast();

//add ts project
//ast.addSourceFiles("../shout/FreeSurvey.Web.Mvc/Shout/**/*{.d.ts,.ts}");
//ast.addSourceFiles("../test/VideoTour/**/*{.d.ts,.ts}");
ast.addSourceFiles("../singletest/test.ts");

const sourceFiles = ast.getSourceFiles();

console.log("\nGetting statements")



sourceFiles.forEach(function(sourceFile){
    const filename=sourceFile.getFilePath();



    for (const statement of sourceFile.getNamespaces()[0].getStatements()) {
        
    
        if (TypeGuards.isVariableStatement(statement)) {
            for (const variableDeclaration of statement.getDeclarationList().getDeclarations()) {
                
                console.log("var: "+variableDeclaration.getName());
            }
        }
        else if (TypeGuards.isNamedNode(statement))
            console.log("Other: " + statement.getName());
        else{
            //console.error(`Unhandled exported statement: ${statement.getText()}`);
            console.log('unhandled statement')
        }
    }

})


/*
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
*/