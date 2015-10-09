/*
Copyright (c) 2010, Geomatics and Cartographic Research Centre, Carleton 
University
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

 - Redistributions of source code must retain the above copyright notice, 
   this list of conditions and the following disclaimer.
 - Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
 - Neither the name of the Geomatics and Cartographic Research Centre, 
   Carleton University nor the names of its contributors may be used to 
   endorse or promote products derived from this software without specific 
   prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
POSSIBILITY OF SUCH DAMAGE.

$Id: n2.scripts.js 8165 2012-05-31 13:14:37Z jpfiset $
*/

// @requires n2.core.js
// @requires n2.utils.js
// @namespace nunaliit2
;(function($n2){

function getScriptLocation(scriptName) {
	var result = null;
	
	if( typeof document === 'object' ) {
		var pattern = new RegExp("(^|(.*?\\/))"+scriptName+"$");
	 
		var scripts = document.getElementsByTagName('script');
		for( var loop=0; loop<scripts.length; ++loop ) {
			var src = scripts[loop].getAttribute('src');
			if (src) {
				var match = src.match(pattern);
				if( match ) {
					result = {
						location: match[1]
						,elem: scripts[loop]
					};
					break;
				};
			};
		};
	};

	return result;
};

function getCoreScriptLocation() {
	return getScriptLocation(nunaliit2CoreScript);
};

function loadScript(scriptUrl, refLocation, insertAfter) {
	var scriptElem = null;
	
	if( typeof refLocation === 'boolean' ){
		insertAfter = refLocation;
		refLocation = undefined;
	} else if( typeof refLocation === 'undefined' ) {
		insertAfter = false;
	}

	var scriptElems = document.getElementsByTagName('script');
	if( scriptElems.length > 0 ){
		scriptElem = scriptElems.item(scriptElems.length - 1);
	};
	
	if( refLocation && refLocation.elem ) {
		scriptElem = refLocation.elem;
	};

	if( scriptElem ){
		var s = document.createElement('script');
		s.setAttribute('src',scriptUrl);
		s.setAttribute('type','text/javascript');
		if( insertAfter ){
			scriptElem.parentNode.insertBefore(s,scriptElem.nextSibling);
		} else {
			scriptElem.parentNode.insertBefore(s,scriptElem);
		};
	};
};

$n2.scripts = {
	getScriptLocation: getScriptLocation
	,getCoreScriptLocation: getCoreScriptLocation
	,loadScript: loadScript
};

})(nunaliit2);