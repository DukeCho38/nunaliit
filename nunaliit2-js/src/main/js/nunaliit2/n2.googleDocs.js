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

*/

;(function($,$n2){
"use strict";

// =============================================
// SpreadSheet
// =============================================

var SpreadSheet = $n2.Class({
	
	descriptor: null
	
	,data: null
	
	,entries: null

	,isCellsData: null
	
	,isListData: null
	
	,initialize: function(opts_){
		var opts = $n2.extend({
			descriptor: null
			,data: null
			,isCellsData: false
			,isListData: false
		},opts_);

		this.descriptor = opts.descriptor;
		this.data = opts.data;
		this.isCellsData = opts.isCellsData;
		this.isListData = opts.isListData;
		this.entries = null;
	}

	,getDescriptor: function(){
		return this.descriptor;
	}
	
	,getTitle: function(){
		if( this.descriptor ){
			return this.descriptor.title;
		};
		return null;
	}
	
	,getData: function(){
		return this.data;
	}

	,getEntries: function(){
		if( null === this.entries ){
			if( this.isCellsData ){
				this.entries = parseSpreadSheetCellFeed(this.data);
			} else if( this.isListData ) {
				this.entries = parseSpreadSheetListFeed(this.data);
			};
		};
		return this.entries;
	}
});	

// =============================================
// SpreadSheetDescriptor
// =============================================

var SpreadSheetDescriptor = $n2.Class({
	
	key: null
	
	,id: null
	
	,position: null
	
	,cellsFeedUrl: null
	
	,listFeedUrl: null
	
	,title: null
	
	,initialize: function(opts_){
		var opts = $n2.extend({
			key: null
			,id: null
			,position: null
			,title: null
			,cellsFeedUrl: null
			,listFeedUrl: null
		},opts_);

		this.key = opts.key;
		this.id = opts.id;
		this.position = opts.position;
		this.title = opts.title;
		this.cellsFeedUrl = opts.cellsFeedUrl;
		this.listFeedUrl = opts.listFeedUrl;
	}

	,getSpreadSheet: function(opts_) {
		var opts = $.extend({
				onSuccess: function(spreadsheet){}
				,onError: function(errMsg){}
			},opts_);
		
		var options = {
			key: this.key
			,descriptor: this
			,onSuccess: opts.onSuccess
			,onError: function(errorMsg){
				opts.onError('Error loading spreadsheet at position '+this.position+': '+errorMsg);
			}
		};
		
		if( this.cellsFeedUrl ){
			options.cellsFeedUrl = this.cellsFeedUrl;
		} if( this.position ){
			options.position = this.position;
		} if( this.listFeedUrl ){
			options.listFeedUrl = this.listFeedUrl;
		};
		
		loadSpreadSheet(options);		
	}
});	

// =============================================
// WorkBook
// =============================================

var WorkBook = $n2.Class({
	
	key: null
	
	,title: null
	
	,author: null
	
	,spreadSheetDescriptors: null
	
	,initialize: function(opts_){
		var opts = $n2.extend({
			key: null
			,title: null
		},opts_);

		this.spreadSheetDescriptors = [];
		
		this.key = opts.key;
		this.title = opts.title;
	}

	,getSpreadSheetDescriptors: function(){
		return this.spreadSheetDescriptors;
	}
	
	,getSpreadSheetDescriptor: function(opts_){
		var opts = $n2.extend({
			id: null
			,position: null
			,title: null
		},opts_);
		
		for(var i=0,e=this.spreadSheetDescriptors.length; i<e; ++i){
			var sd = this.spreadSheetDescriptors[i];
			
			if( opts.id && opts.id === sd.id ) {
				return sd;
			} else if( typeof(opts.position) === 'number' && opts.position === sd.position ) {
				return sd;
			} else if( opts.title && opts.title === sd.title ) {
				return sd;
			};
		};
		
		return null;
	}
	
	,getSpreadSheet: function(opts_){
		var opts = $n2.extend({
			id: null
			,position: null
			,title: null
			,onSuccess: function(speadsheet){}
			,onError: function(errMsg){}
		},opts_);
		
		var sd = this.getSpreadSheetDescriptor(opts);
		if( sd ){
			sd.getSpreadSheet({
				onSuccess: opts.onSuccess
				,onError: opts.onError
			});
			return;
		};
		
		opts.onError('SpreadSheet descriptor not found: '+opts.title+'/'+opts.id+'/'+opts.position);
	}
	
	,getAllSpreadSheets: function(opts_){
		var opts = $n2.extend({
			onSuccess: function(arr){}
			,onError: function(errMsg){}
		},opts_);

		var descriptors = this.getSpreadSheetDescriptors();
		
		var result = [];
		if( descriptors.length <= 0 ){
			opts.onSuccess(result);
			
		} else {
			var waiting = [];

			for(var i=0,e=descriptors.length; i<e; ++i){
				waiting.push(descriptors[i]);
			};
			
			for(var i=0,e=descriptors.length; i<e; ++i){
				var sd = descriptors[i];
				sd.getSpreadSheet({
					onSuccess: loaded
					,onError: opts.onError
				});
			};
		};
		
		function loaded(spreadSheet){
			var desc = spreadSheet.getDescriptor();
			var descIndex = waiting.indexOf(desc);
			if( descIndex >= 0 ){
				waiting.splice(descIndex, 1);
			};

			result.push(spreadSheet);
			
			if( waiting.length > 0 ){
				return; // still waiting
			};
			
			// All arrived
			opts.onSuccess(result);
		};
	}
});	
	
function getWorkBook(options_) {
	var options = $.extend({
			key: null
			,onSuccess: function(workbook){}
			,onError: function(errMsg){}
		},options_);
		
	if( !options.key ) {
		options.onError('Google Spreadsheet key required.');
	};
	
	$.ajax({
		async: true
		,dataType: 'json'
		,data: {
			alt: 'json'
		}
		,traditional: true
		,url: 'https://spreadsheets.google.com/feeds/worksheets/'+options.key+'/public/basic'
		,success: handleData
		,error: function(XMLHttpRequest, textStatus, errorThrown){
			options.onError('Unable to load workbook: '+textStatus);
		}
	});
	
	function handleData(data) {
		var workbook = new WorkBook({
			key: options.key
		});
		
		if( data && data.feed ){
			var feed = data.feed;
			
			if( feed.title && feed.title.$t ){
				workbook.title = feed.title.$t;
			};
			
			if( feed.author ){
				workbook.author = {};
				
				if( feed.author.name && feed.author.name.$t ){
					workbook.author.name = feed.author.name.$t;
				};
				
				if( feed.author.email && feed.author.email.$t ){
					workbook.author.email = feed.author.email.$t;
				};
			};
			
			if( feed.entry ){
				for(var i=0,e=feed.entry.length; i<e; ++i){
					var entry = feed.entry[i];
					var sheet = {
						key: options.key
						,position: i+1
					};
					
					if( entry.title ){
						sheet.title = entry.title.$t;
					};
					
					if( entry.id && entry.id.$t ){
						var index = entry.id.$t.lastIndexOf('/');
						if( index >= 0 ){
							sheet.id = entry.id.$t.substr(index+1);
						};
					};
					
					if( entry.link ){
						for(var j=0,k=entry.link.length;j<k;++j){
							var link = entry.link[j];
							if( link.rel === 'http://schemas.google.com/spreadsheets/2006#cellsfeed' ) {
								sheet.cellsFeedUrl = link.href;
							} else if( link.rel === 'http://schemas.google.com/spreadsheets/2006#listfeed' ) {
								sheet.listFeedUrl = link.href;
							};
						};
					};
					
					var sd = new SpreadSheetDescriptor(sheet);

					workbook.spreadSheetDescriptors.push(sd);
				};
			};
		};
		
		options.onSuccess(workbook);
	};
};
	
//=============================================
// Functions
//=============================================
	
function loadSpreadSheet(opts_) {
	var opts = $.extend({
			key: null
			,position: null
			,cellsFeedUrl: null
			,listFeedUrl: null
			,descriptor: null
			,onSuccess: function(data){}
			,onError: function(errorMsg){}
		},opts_);
	
	var url = null;
	var isCellsData = false;
	var isListData = false;
		
	if( opts.cellsFeedUrl ) {
		url = opts.cellsFeedUrl;
		isCellsData = true;
		
	} else if( opts.key && opts.position ) {
		url = 'https://spreadsheets.google.com/feeds/cells/'+opts.key+'/'+opts.position+'/public/values';
		isCellsData = true;

	} else if( opts.listFeedUrl ) {
		url = opts.listFeedUrl;
		isListData = true;
		
	} else {
		opts.onError('Requested spreadsheet not identified.');
		return;
	};
	
	$.ajax({
		async: true
		,dataType: 'json'
		,data: {
			alt: 'json'
		}
		,traditional: true
		,url: url
		,success: function(data){
			var ss = new SpreadSheet({
				descriptor: opts.descriptor
				,data: data
				,isCellsData: isCellsData
				,isListData: isListData
			});
			opts.onSuccess(ss);
		}
		,error: function(XMLHttpRequest, textStatus, errorThrown){
			opts.onError('Unable to load spreadsheet: '+textStatus);
		}
	});
};

var gsxRe = /^gsx\$(.*)$/;
function parseSpreadSheetListFeed(data) {
	var res = [];
	
	if( data && data.feed && data.feed.entry ) {
		var entries = data.feed.entry;
		for(var loop=0; loop<entries.length; ++loop) {
			var entry = entries[loop];
			var e = {};
			for(var key in entry) {
				var match = key.match(gsxRe);
				if( match ) {
					var value = entry[key].$t;
					e[match[1]] = value;
				};
			};
			res.push(e);
		};
	};

	return res;
};

var reIdRowCol = /\/R([0-9]+)C([0-9]+)$/;
function parseSpreadSheetCellFeed(data) {
	var res = [];
	
	if( data && data.feed && data.feed.entry ) {
		var cells = data.feed.entry;
		
		// First pass, assign row/col to each entry.
		// Accumulate columns
		var entries = [];
		var columnByPosition = [];
		var columnByName = {};
		for(var loop=0,loopEnd=cells.length; loop<loopEnd; ++loop) {
			var cell = cells[loop];
			if( cell.id && cell.id['$t'] ){
				var test = reIdRowCol.exec(cell.id['$t']);
				if( test ){
					cell._row = 1 * test[1];
					cell._col = 1 * test[2];
					
					if( cell._row === 1 ){
						// header
						var name = '_'+cell._col;
						if( cell.content && cell.content['$t'] ){
							name = cell.content['$t'];
						};
						
						var column = null;
						if( columnByName[name] ){
							columnByName[name].isArray = true;
						} else {
							column = {
								name: name
								,isArray: false
							};
							columnByName[name] = column;
						};
						
						columnByPosition[cell._col] = column;
						
					} else {
						entries.push(cell);
					};
				};
			};
		};
		
		// Sort
		entries.sort(function(a,b){
			if( a._row < b._row ) return -1;
			if( a._row > b._row ) return 1;
			if( a._col < b._col ) return -1;
			if( a._col > b._col ) return 1;
			return 0;
		});

		// Second pass, create entries
		var currentEntry = null;
		var currentRow = -1;
		for(var loop=0,loopEnd=entries.length; loop<loopEnd; ++loop) {
			var cell = entries[loop];
			
			if( currentRow != cell._row ){
				if( currentEntry ){
					completeEntry(currentEntry);
				};
				currentRow = cell._row;
				currentEntry = {};
				res.push(currentEntry);
			};
			
			var isArray = true;
			var colName = '_';
			var column = columnByPosition[cell._col];
			if( column ){
				isArray = column.isArray;
				colName = column.name;
			};
			
			var value = '';
			if( cell.content && cell.content['$t'] ){
				value = cell.content['$t'];
			};
			
			if( isArray ){
				if( !currentEntry[colName] ) {
					currentEntry[colName] = [];
				};
				currentEntry[colName].push(value);
				
			} else {
				currentEntry[colName] = value;
			};
		};
		
		// Complete last entry
		if( currentEntry ){
			completeEntry(currentEntry);
		};
	};

	return res;
	
	function completeEntry(entry){
		if( entry ){
			for(var colName in columnByName){
				var column = columnByName[colName];
				if( typeof(entry[colName]) === 'undefined' ){
					if( column.isArray ){
						entry[colName] = [];
					} else {
						entry[colName] = '';
					};
				};
			};
		};
	};
};

$n2.googleDocs = {
	getWorkBook: getWorkBook
	,loadSpreadSheet: loadSpreadSheet
};

})(jQuery,nunaliit2);