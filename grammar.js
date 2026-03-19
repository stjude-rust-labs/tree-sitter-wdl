/// <reference types="tree-sitter-cli/dsl" />

const PREC = {
  OR: 1,
  AND: 2,
  COMPARE: 3,
  ADD: 4,
  MUL: 5,
  UNARY: 6,
  CALL: 7,
  MEMBER: 8,
  INDEX: 9,
};

module.exports = grammar({
  name: "wdl",

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,

  rules: {
    document: ($) =>
      seq(
        optional($.version),
        repeat(choice($.import, $.struct, $.enum, $.task, $.workflow)),
      ),

    version: ($) => seq("version", $.version_identifier),

    version_identifier: (_) => /[0-9]+\.[0-9]+/,

    comment: (_) => token(seq("#", /.*/)),

    // Imports

    import: ($) =>
      seq(
        "import",
        $.string_literal,
        optional(seq("as", $.identifier)),
        repeat($.import_alias),
      ),

    import_alias: ($) => seq("alias", $.identifier, "as", $.identifier),

    // Struct

    struct: ($) =>
      seq(
        "struct",
        $.identifier,
        "{",
        repeat($.declaration),
        "}",
      ),

    // Enum (WDL 1.3)

    enum: ($) =>
      seq(
        "enum",
        $.identifier,
        "{",
        repeat($.identifier),
        "}",
      ),

    // Task

    task: ($) =>
      seq(
        "task",
        $.identifier,
        "{",
        repeat(
          choice(
            $.input_block,
            $.output_block,
            $.command_block,
            $.runtime_block,
            $.requirements_block,
            $.hints_block,
            $.meta_block,
            $.parameter_meta_block,
            $.declaration,
          ),
        ),
        "}",
      ),

    // Workflow

    workflow: ($) =>
      seq(
        "workflow",
        $.identifier,
        "{",
        repeat(
          choice(
            $.input_block,
            $.output_block,
            $.meta_block,
            $.parameter_meta_block,
            $.hints_block,
            $.call,
            $.scatter,
            $.conditional,
            $.declaration,
          ),
        ),
        "}",
      ),

    // Blocks

    input_block: ($) =>
      seq("input", "{", repeat($.declaration), "}"),

    output_block: ($) =>
      seq("output", "{", repeat($.bound_declaration), "}"),

    command_block: ($) =>
      choice($.command_block_curly, $.command_block_heredoc),

    command_block_curly: ($) =>
      seq("command", "{", repeat(choice($.command_text_curly, $.placeholder)), "}"),

    command_block_heredoc: ($) =>
      seq("command", "<<<", repeat(choice($.command_text_heredoc, $.placeholder)), ">>>"),

    command_text_curly: (_) =>
      token(prec(-1, /[^~$}]+|[~$][^{]|[~$]/)),

    command_text_heredoc: (_) =>
      token(prec(-1, /[^~$><]+|[~$][^{]|[~$]|<[^<]|<<[^<]|>[^>]|>>[^>]/)),

    placeholder: ($) => seq(choice("~{", "${"), $.expression, "}"),

    runtime_block: ($) =>
      seq("runtime", "{", repeat($.runtime_attribute), "}"),

    requirements_block: ($) =>
      seq("requirements", "{", repeat($.runtime_attribute), "}"),

    runtime_attribute: ($) => seq($.identifier, ":", $.expression),

    hints_block: ($) =>
      seq("hints", "{", repeat($.hints_attribute), "}"),

    hints_attribute: ($) =>
      choice(
        $.meta_attribute,
        seq($.identifier, "{", repeat($.meta_attribute), "}"),
      ),

    meta_block: ($) =>
      seq("meta", "{", repeat($.meta_attribute), "}"),

    parameter_meta_block: ($) =>
      seq("parameter_meta", "{", repeat($.meta_attribute), "}"),

    meta_attribute: ($) => seq($.identifier, ":", $.meta_value),

    meta_value: ($) =>
      choice(
        $.meta_object,
        $.meta_array,
        $.meta_string,
        $.meta_number,
        $.boolean_literal,
        $.null_literal,
      ),

    meta_string: ($) =>
      choice($.single_quoted_string, $.double_quoted_string, $.multi_line_string),

    meta_number: (_) =>
      token(
        seq(
          optional("-"),
          choice(
            /[0-9]+\.[0-9]*([eE][+-]?[0-9]+)?/,
            /[0-9]+[eE][+-]?[0-9]+/,
            /\.[0-9]+([eE][+-]?[0-9]+)?/,
            /0[xX][0-9a-fA-F]+/,
            /0[0-7]+/,
            /[0-9]+/,
          ),
        ),
      ),

    meta_object: ($) =>
      seq(
        "{",
        optional(
          seq(
            $.meta_attribute,
            repeat(seq(optional(","), $.meta_attribute)),
            optional(","),
          ),
        ),
        "}",
      ),

    meta_array: ($) =>
      seq(
        "[",
        optional(
          seq($.meta_value, repeat(seq(",", $.meta_value)), optional(",")),
        ),
        "]",
      ),

    multi_line_string: ($) =>
      seq(
        "<<<",
        repeat(
          choice(
            $.multi_line_string_text,
            $.escape_sequence,
            $.string_placeholder,
          ),
        ),
        ">>>",
      ),

    multi_line_string_text: (_) =>
      token(prec(-1, /[^\\~$><]+|[~$][^{]|[~$]|<[^<]|<<[^<]|>[^>]|>>[^>]/)),

    // Declarations

    declaration: ($) =>
      seq(optional("env"), $.type, $.identifier, optional(seq("=", $.expression))),

    bound_declaration: ($) => seq(optional("env"), $.type, $.identifier, "=", $.expression),

    // Types

    type: ($) =>
      seq(
        choice(
          $.primitive_type,
          $.array_type,
          $.map_type,
          $.pair_type,
          $.object_type,
          $.user_type,
        ),
        optional("?"),
      ),

    primitive_type: (_) =>
      choice("Boolean", "Int", "Float", "String", "File", "Directory"),

    array_type: ($) => seq("Array", "[", $.type, "]", optional("+")),

    map_type: ($) => seq("Map", "[", $.type, ",", $.type, "]"),

    pair_type: ($) => seq("Pair", "[", $.type, ",", $.type, "]"),

    object_type: (_) => "Object",

    user_type: ($) => $.identifier,

    // Call

    call: ($) =>
      seq(
        "call",
        $.qualified_identifier,
        optional(seq("as", $.identifier)),
        repeat(seq("after", $.identifier)),
        optional($.call_body),
      ),

    qualified_identifier: ($) =>
      seq($.identifier, repeat(seq(".", $.identifier))),

    call_body: ($) =>
      seq(
        "{",
        optional(
          choice(
            $.call_inputs,
            seq(commaSep1($.call_input), optional(",")),
          ),
        ),
        "}",
      ),

    call_inputs: ($) =>
      seq("input", ":", commaSep1($.call_input), optional(",")),

    call_input: ($) =>
      seq($.identifier, optional(seq("=", $.expression))),

    // Scatter

    scatter: ($) =>
      seq(
        "scatter",
        "(",
        $.identifier,
        "in",
        $.expression,
        ")",
        "{",
        repeat(choice($.call, $.scatter, $.conditional, $.declaration)),
        "}",
      ),

    // Conditional

    conditional: ($) =>
      seq(
        "if",
        "(",
        $.expression,
        ")",
        "{",
        repeat(choice($.call, $.scatter, $.conditional, $.declaration)),
        "}",
        repeat($.conditional_else_if),
        optional($.conditional_else),
      ),

    conditional_else_if: ($) =>
      seq(
        "else",
        "if",
        "(",
        $.expression,
        ")",
        "{",
        repeat(choice($.call, $.scatter, $.conditional, $.declaration)),
        "}",
      ),

    conditional_else: ($) =>
      seq(
        "else",
        "{",
        repeat(choice($.call, $.scatter, $.conditional, $.declaration)),
        "}",
      ),

    // Expressions

    expression: ($) =>
      choice(
        $.or_expression,
        $.and_expression,
        $.equality_expression,
        $.comparison_expression,
        $.addition_expression,
        $.multiplication_expression,
        $.unary_expression,
        $.apply_expression,
        $.member_expression,
        $.index_expression,
        $.ternary_expression,
        $.primary_expression,
      ),

    or_expression: ($) =>
      prec.left(PREC.OR, seq($.expression, "||", $.expression)),

    and_expression: ($) =>
      prec.left(PREC.AND, seq($.expression, "&&", $.expression)),

    equality_expression: ($) =>
      prec.left(
        PREC.COMPARE,
        seq($.expression, choice("==", "!="), $.expression),
      ),

    comparison_expression: ($) =>
      prec.left(
        PREC.COMPARE,
        seq($.expression, choice("<", "<=", ">", ">="), $.expression),
      ),

    addition_expression: ($) =>
      prec.left(PREC.ADD, seq($.expression, choice("+", "-"), $.expression)),

    multiplication_expression: ($) =>
      prec.left(
        PREC.MUL,
        seq($.expression, choice("*", "/", "%"), $.expression),
      ),

    unary_expression: ($) =>
      prec(PREC.UNARY, seq(choice("!", "-"), $.expression)),

    apply_expression: ($) =>
      prec(
        PREC.CALL,
        seq($.identifier, "(", optional(commaSep1($.expression)), ")"),
      ),

    member_expression: ($) =>
      prec.left(PREC.MEMBER, seq($.expression, ".", $.identifier)),

    index_expression: ($) =>
      prec.left(PREC.INDEX, seq($.expression, "[", $.expression, "]")),

    ternary_expression: ($) =>
      prec.right(
        seq("if", $.expression, "then", $.expression, "else", $.expression),
      ),

    primary_expression: ($) =>
      choice(
        $.string_literal,
        $.integer_literal,
        $.float_literal,
        $.boolean_literal,
        $.none_literal,
        $.left_literal,
        $.right_literal,
        $.struct_literal,
        $.identifier,
        $.array_literal,
        $.map_literal,
        $.pair_literal,
        $.object_literal,
        $.parenthesized_expression,
      ),

    parenthesized_expression: ($) => seq("(", $.expression, ")"),

    // Literals

    boolean_literal: (_) => choice("true", "false"),

    null_literal: (_) => "null",

    none_literal: (_) => "None",

    left_literal: (_) => "left",

    right_literal: (_) => "right",

    integer_literal: (_) =>
      token(choice(/0[xX][0-9a-fA-F]+/, /0[0-7]+/, /0/, /[1-9][0-9]*/)),

    float_literal: (_) =>
      token(
        choice(
          /[0-9]+\.[0-9]*([eE][+-]?[0-9]+)?/,
          /[0-9]+[eE][+-]?[0-9]+/,
          /\.[0-9]+([eE][+-]?[0-9]+)?/,
        ),
      ),

    string_literal: ($) =>
      choice($.single_quoted_string, $.double_quoted_string),

    single_quoted_string: ($) =>
      seq(
        "'",
        repeat(
          choice($.string_text_single, $.escape_sequence, $.string_placeholder),
        ),
        "'",
      ),

    double_quoted_string: ($) =>
      seq(
        '"',
        repeat(
          choice($.string_text_double, $.escape_sequence, $.string_placeholder),
        ),
        '"',
      ),

    string_text_single: (_) =>
      token(prec(-1, /[^'\\~$]+|[~$][^{]|[~$]/)),

    string_text_double: (_) =>
      token(prec(-1, /[^"\\~$]+|[~$][^{]|[~$]/)),

    string_placeholder: ($) =>
      seq(choice("~{", "${"), $.expression, "}"),

    escape_sequence: (_) =>
      token(
        seq(
          "\\",
          choice(
            /[\\nrt'"~$]/,
            /[0-7]{3}/,
            /x[0-9a-fA-F]{2}/,
            /u[0-9a-fA-F]{4}/,
            /U[0-9a-fA-F]{8}/,
          ),
        ),
      ),

    array_literal: ($) =>
      seq("[", optional(commaSep1($.expression)), optional(","), "]"),

    map_literal: ($) =>
      seq(
        "{",
        optional(
          seq($.map_entry, repeat(seq(",", $.map_entry)), optional(",")),
        ),
        "}",
      ),

    map_entry: ($) => seq($.expression, ":", $.expression),

    pair_literal: ($) => seq("(", $.expression, ",", $.expression, ")"),

    struct_literal: ($) =>
      seq(
        $.identifier,
        "{",
        optional(
          seq(
            $.object_field,
            repeat(seq(",", $.object_field)),
            optional(","),
          ),
        ),
        "}",
      ),

    object_literal: ($) =>
      seq(
        "object",
        "{",
        optional(
          seq(
            $.object_field,
            repeat(seq(",", $.object_field)),
            optional(","),
          ),
        ),
        "}",
      ),

    object_field: ($) => seq($.identifier, ":", $.expression),

    identifier: (_) => /[a-zA-Z][a-zA-Z0-9_]*/,
  },
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
