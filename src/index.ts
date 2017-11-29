import * as tsModule from "typescript/lib/tsserverlibrary";

function init(modules: { typescript: typeof tsModule }) {
  const ts = modules.typescript;

  return {
    create: (info: ts.server.PluginCreateInfo) => {
      const nextLanguageService = { ...info.languageService };
      const { getSemanticDiagnostics } = info.languageService;

      nextLanguageService.getSemanticDiagnostics = (fileName: string) => {
        const program = info.languageService.getProgram();
        const previous = getSemanticDiagnostics(fileName) || [];
        const sourceFile = program.getSourceFile(fileName);
        const errors = [];

        visitAllNodes(sourceFile, node => {
          if (
            isVariableDeclaration(node) &&
            startsWithIs(node) &&
            !isBoolean(node, program)
          ) {
            errors.push(reportError(node, sourceFile));
          }
        });

        return [...previous, ...errors];
      };

      return nextLanguageService;
    }
  };

  function visitAllNodes(node: ts.Node, visitor: (node: ts.Node) => void) {
    visitor(node);
    node.forEachChild(child => visitAllNodes(child, visitor));
  }

  function isVariableDeclaration(
    node: ts.Node
  ): node is ts.VariableDeclaration {
    return node.kind === ts.SyntaxKind.VariableDeclaration;
  }

  function startsWithIs(node: ts.VariableDeclaration) {
    return node.name.getText().startsWith("is");
  }

  function isBoolean(node: ts.VariableDeclaration, program: ts.Program) {
    const type = program.getTypeChecker().getTypeAtLocation(node);
    return type.flags & ts.TypeFlags.BooleanLike;
  }

  function reportError(
    node: ts.VariableDeclaration,
    sourceFile: ts.SourceFile
  ): ts.Diagnostic {
    return {
      file: sourceFile,
      start: node.name.getStart(),
      length: node.name.getEnd() - node.getStart(),
      messageText: `Rename ${node.name.getText()} or make it type "boolean"`,
      category: ts.DiagnosticCategory.Error,
      source: "dotJS",
      code: 42
    };
  }
}

module.exports = init;
