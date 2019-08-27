
/* description: Parses style rules */

%{
// Utilities
function classNamesFromElement(elem){
	var names = undefined;
	
	var classAttr = elem.getAttribute('class');
	if( classAttr ){
		names = classAttr.split(' ').filter(function(name){
			return (name.length > 0);
		});
	};
	
	return names;
};

// Functions in the global space receives the context object
// as 'this'.
var global = {
	isSelected: function(){
		return this.n2_selected;
	}
	,isHovered: function(){
		return this.n2_hovered;
	}
	,isFound: function(){
		return this.n2_found;
	}
	,isPoint: function(){
		return 'point' === this.n2_geometry;
	}
	,isLine: function(){
		return 'line' === this.n2_geometry;
	}
	,isPolygon: function(){
		return 'polygon' === this.n2_geometry;
	}
	,isSchema: function(schemaName){
		if( schemaName && this.n2_doc ){
			return (schemaName === this.n2_doc.nunaliit_schema);
		};
		return false;
	}
	,onLayer: function(layerId){
		if( layerId
		 && this.n2_doc 
		 && this.n2_doc.nunaliit_layers ){
		 	var index = this.n2_doc.nunaliit_layers.indexOf(layerId);
			return (index >= 0);
		};
		return false;
	}
	,hasClass: function(className){
		if( className
		 && this.n2_elem ){
			var classNames = classNamesFromElement(this.n2_elem);
		 	var index = -1;
		 	if( classNames ){
			 	index = classNames.indexOf(className);
		 	};
			return (index >= 0);
		};
		return false;
	}
	,Math: Math
};
parser.global = global;

// -----------------------------------------------------------
var FunctionCall = function(value, args){
	this.value = value;
	this.args = args;
};
FunctionCall.prototype.getValue = function(ctxt){
	var value = this.value.getValue(ctxt);
	if( typeof value === 'function' ){
		var args = [];
		if( this.args ){
			this.args.pushOnArray(ctxt, args);
		};
		return value.apply(ctxt, args);
	};
	return false;
};

// -----------------------------------------------------------
// Argument
var Argument = function(a1, a2){
	this.valueNode = a1;
	if( a2 ){
		this.nextArgument = a2;
	} else {
		this.nextArgument = null;
	};
};
Argument.prototype.getCount = function(){
	if( this.nextArgument ){
		return 1 + this.nextArgument.getCount();
	};
	
	return 1;
};
Argument.prototype.getArgument = function(ctxt, position){
	if( position < 1 ){
		return this.valueNode.getValue(ctxt);
	};
	
	if( this.nextArgument ){
		this.nextArgument.getArgument(ctxt, position-1);
	};
	
	return undefined;
};
Argument.prototype.pushOnArray = function(ctxt, array){
	var value = this.valueNode.getValue(ctxt);
	array.push(value);
	
	if( this.nextArgument ){
		this.nextArgument.pushOnArray(ctxt, array);
	};
};

// -----------------------------------------------------------
var Expression = function(n1, op, n2){
	this.n1 = n1;
	this.n2 = n2;
	this.op = op;
};
Expression.prototype.getValue = function(ctxt){
	var r1 = this.n1.getValue(ctxt);
	var r2 = undefined;
	if( this.n2 ){
		r2 = this.n2.getValue(ctxt);
	};
	if( '!' === this.op ){
		return !r1;
		
	} else if( '&&' === this.op ){
		return (r1 && r2);
		
	} else if( '||' === this.op ){
		return (r1 || r2);
	};
	return false;
};

// -----------------------------------------------------------
var Literal = function(value){
	this.value = value;
};
Literal.prototype.getValue = function(ctxt){
	return this.value;
};

// -----------------------------------------------------------
var Comparison = function(leftNode, rightNode, op){
	this.leftNode = leftNode;
	this.rightNode = rightNode;
	this.op = op;
};
Comparison.prototype.getValue = function(ctxt){
	var left = this.leftNode.getValue(ctxt);
	var right = this.rightNode.getValue(ctxt);

	if( '==' === this.op ){
		return (left == right);

	} else if( '!=' === this.op ){
		return (left != right);

	} else if( '>=' === this.op ){
		return (left >= right);

	} else if( '<=' === this.op ){
		return (left <= right);

	} else if( '>' === this.op ){
		return (left > right);

	} else if( '<' === this.op ){
		return (left < right);
	};
	
	return false;
};

// -----------------------------------------------------------
var MathOp = function(leftNode, rightNode, op){
	this.leftNode = leftNode;
	this.rightNode = rightNode;
	this.op = op;
};
MathOp.prototype.getValue = function(ctxt){
	var left = this.leftNode.getValue(ctxt);
	var right = this.rightNode.getValue(ctxt);

	if( '+' === this.op ){
		return (left + right);

	} else if( '-' === this.op ){
		return (left - right);

	} else if( '*' === this.op ){
		return (left * right);

	} else if( '/' === this.op ){
		return (left / right);

	} else if( '%' === this.op ){
		return (left % right);
	};
	
	return 0;
};

// -----------------------------------------------------------
var ObjectSelector = function(id, previousSelector){
	this.idNode = id;
	this.previousSelector = previousSelector;
};
ObjectSelector.prototype.getValue = function(ctxt){
	var obj = this.previousSelector.getValue(ctxt);
	if( typeof obj === 'object' ){
		var id = this.idNode.getValue(ctxt);
		if( typeof id === 'undefined' ){
			return undefined;
		};
		
		return obj[id];
	};

	return undefined;
};

// -----------------------------------------------------------
var Variable = function(variableName){
	this.variableName = variableName;
};
Variable.prototype.getValue = function(ctxt){
	var obj = undefined;
	
	if( ctxt && 'doc' === this.variableName ) {
		obj = ctxt.n2_doc;
		
	} else if( ctxt && ctxt[this.variableName] ) {
		obj = ctxt[this.variableName];
		
	} else if( global && global[this.variableName] ) {
		obj = global[this.variableName];
	};
	
	return obj;
};

%}

/* lexical grammar */
%lex
%%

\s+                    { /* skip whitespace */ }
"true"                 { return 'true'; }
"false"                { return 'false'; }
[0-9]+("."[0-9]+)?\b   { return 'NUMBER'; }
[_a-zA-Z][_a-zA-Z0-9]* { return 'VAR_NAME'; }
"'"(\\\'|[^'])*"'"     { yytext = yytext.substr(1,yytext.length-2); return 'STRING'; }
"=="                   { return '=='; }
"!="                   { return '!='; }
">="                   { return '>='; }
"<="                   { return '<='; }
">"                    { return '>'; }
"<"                    { return '<'; }
"("                    { return '('; }
")"                    { return ')'; }
"{"                    { return '{'; }
"}"                    { return '}'; }
"["                    { return '['; }
"]"                    { return ']'; }
","                    { return ','; }
"."                    { return '.'; }
"!"                    { return '!'; }
"+"                    { return '+'; }
"-"                    { return '-'; }
"*"                    { return '*'; }
"/"                    { return '/'; }
"%"                    { return '%'; }
"&&"                   { return '&&'; }
"||"                   { return '||'; }
<<EOF>>                { return 'EOF'; }
.                      { return 'INVALID'; }

/lex

/* operator associations and precedence */

%left '&&' '||'
%left '<' '>' '<=' '>=' '==' '!='
%left '+' '-'
%left '*' '/' '%'
%left ','
%right '!'


%start program

%% /* language grammar */

program
    : value EOF
        { return $1; }
    ;

value
    : value '&&' value
        {
        	$$ = new Expression($1,'&&',$3);
        }
    | value '||' value
        {
        	$$ = new Expression($1,'||',$3);
        }
    | '!' value
        {
        	$$ = new Expression($2,'!');
        }
    | '(' value ')'
    	{
    		$$ = $2;
    	}
    | value '==' value
        {
        	$$ = new Comparison($1,$3,'==');
        }
    | value '!=' value
        {
        	$$ = new Comparison($1,$3,'!=');
        }
    | value '>=' value
        {
        	$$ = new Comparison($1,$3,'>=');
        }
    | value '<=' value
        {
        	$$ = new Comparison($1,$3,'<=');
        }
    | value '>' value
        {
        	$$ = new Comparison($1,$3,'>');
        }
    | value '<' value
        {
        	$$ = new Comparison($1,$3,'<');
        }
	| identifier '(' ')'
        {
        	$$ = new FunctionCall($1,null);
        }
    | identifier '(' arguments ')'
        {
        	$$ = new FunctionCall($1,$3);
        }
    | identifier
        {
        	$$ = $1;
        }
    | 'true'
    	{
    		$$ = new Literal(true);
    	}
    | 'false'
    	{
    		$$ = new Literal(false);
    	}
    | 'NUMBER'
    	{
    		$$ = new Literal(1 * $1);
    	}
    | 'STRING'
    	{
    		$$ = new Literal($1);
    	}
    | value '+' value
    	{
    		$$ = new MathOp($1,$3,'+');
    	}
    | value '-' value
    	{
    		$$ = new MathOp($1,$3,'-');
    	}
    | value '*' value
    	{
    		$$ = new MathOp($1,$3,'*');
    	}
    | value '/' value
    	{
    		$$ = new MathOp($1,$3,'/');
    	}
    | value '%' value
    	{
    		$$ = new MathOp($1,$3,'%');
    	}
    ;

arguments
    : value ',' arguments
        {
        	$$ = new Argument($1,$3);
        }
    | value
        {
        	$$ = new Argument($1);
        }
    ;

identifier
    : identifier '.' 'VAR_NAME'
        {
        	var id = new Literal($3);
        	$$ = new ObjectSelector(id,$1);
        }
    | identifier '[' value ']'
        {
        	$$ = new ObjectSelector($3,$1);
        }
    | 'VAR_NAME'
        {
        	$$ = new Variable($1);
        }
    ;

%%


