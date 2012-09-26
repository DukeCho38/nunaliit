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

$Id: olkit_adhocQueries.js 8165 2012-05-31 13:14:37Z jpfiset $
*/

// @requires n2.utils.js

;(function($){

	var defaultOptions = {
		getUrl: 'adhocQueries/query'
		,onError: function(xmlHttpRequest, textStatus, errorThrown) {
			log('olkitAdhocQueries error: ', textStatus, errorThrown);
		}
		,onSuccess: function(result){}
	};
	
	var currentOptions = $.extend({},defaultOptions);

	/*
	 * @param options_.id  Number for query to be selected
	 * @param options_.label Name for query to be selected (use id or label, not both)
	 * @param options_.args Array of arguments (e.g., [1,2,3])
	 * @param options_.onSuccess Function for handling successful response (function(msg, status){})
	 */
	function query(options_) {
	
		var options = $.extend({}, currentOptions, options_);
		
		var data = {};
		if( typeof(options_.id) != 'undefined' ) {
			data.id = options_.id;
		};
		if( typeof(options_.label) != 'undefined' ) {
			data.label = options_.label;
		};
		if( typeof(options_.args) != 'undefined' ) {
			data.args = options_.args.join(',');
		};
		
		$.ajax({
			type: 'GET'
			,url: options.getUrl
			,data: data
			,dataType: 'json'
			,async: true
			,success: success
			,error: options.onError
		});
		
		function success(resultObj) {
			if( typeof(resultObj.results) == 'undefined' ) {
				options.onError(null, 'Invalid results', {});
			} else {
				options.onSuccess(resultObj.results);
			};
		};
	};

	function setDefaultOptions(options_) {
		currentOptions = $.extend({}, defaultOptions, options_)
	};
	

	$.NUNALIIT_ADHOC_QUERIES = {
		query: query
		,setDefaultOptions: setDefaultOptions
	};

})(jQuery);