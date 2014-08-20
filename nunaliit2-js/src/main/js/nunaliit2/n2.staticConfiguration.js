/*
Copyright (c) 2014, Geomatics and Cartographic Research Centre, Carleton 
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

// Localization
var _loc = function(str,args){ return $n2.loc(str,'nunaliit2-static',args); };

// ===========================================================
function Configure(options_){
	
	var options = $n2.extend({
		onSuccess: function(config){}
	},options_);

	var configuration = {
		directory: {}
	};
	
	// Start function
	configuration.start = function(){
		if( configuration.directory.dispatchService ){
			configuration.directory.dispatchService.send('n2.couchConfiguration',{type:'start'});
		};
	};

	// Dispatcher
	configuration.directory.dispatchService = new $n2.dispatch.Dispatcher();
	
	// History monitoring
	configuration.directory.historyMonitor = new $n2.history.Monitor({
		directory: configuration.directory
	});
	configuration.directory.historyTracker = new $n2.history.Tracker({
		directory: configuration.directory
	});
	
	// Event translation
	configuration.directory.eventService = new $n2.couchEvents.EventSupport({
		directory: configuration.directory
	});
	
	// Custom Service
	configuration.directory.customService = new $n2.custom.CustomService({
		directory: configuration.directory
	});

	// Configuration
//	configuration.directory.configService = new ConfigService({
//		url: options.configServerUrl
//	});
	
 	// Turn off cometd
 	$.cometd = {
 		init: function(){}
 		,subscribe: function(){}
 		,publish: function(){}
 	};
 	
//	configuration.atlasDb = configuration.couchServer.getDb({dbUrl:options.atlasDbUrl});
//	configuration.atlasDesign = configuration.atlasDb.getDesignDoc({ddName:options.atlasDesignName});
//	configuration.siteDesign = configuration.atlasDb.getDesignDoc({ddName:options.siteDesignName});
	
	configuration.dataSources = [];
	
	var couchDbDs = null;
	couchDbDs = new $n2.couchDocument.CouchDataSource({
		id: 'main'
		,db: configuration.atlasDb
		,dispatchService: configuration.directory.dispatchService
	});
	configuration.dataSources.push(couchDbDs);
	configuration.documentSource = couchDbDs;

	// Check browser compliance
	if( $n2.couchHelp 
	 && $n2.couchHelp.CheckBrowserCompliance ){
		$n2.couchHelp.CheckBrowserCompliance({
			db: configuration.atlasDb
		});
	};
	configuration.directory.schemaRepository = new $n2.couchSchema.CouchSchemaRepository({
		db: configuration.atlasDb
		,designDoc: configuration.atlasDesign
		,dispatchService: configuration.directory.dispatchService
		,preload: true
		,preloadedCallback: schemasPreloaded 
	});
	
	function schemasPreloaded() {

		configuration.directory.dateService = new $n2.dateService.DateService({
			url: options.dateServerUrl
		});
		
	 	configuration.directory.searchService = new $n2.couchSearch.SearchServer({
			designDoc: configuration.atlasDesign
			,db: configuration.atlasDb
			,dateService: configuration.directory.dateService
			,directory: configuration.directory
		});
		
	 	configuration.mediaRelativePath = options.mediaUrl;

	 	configuration.directory.requestService = new $n2.couchRequests({
			db: configuration.atlasDb
			,userDb: $n2.couch.getUserDb()
			,designDoc: configuration.atlasDesign
			,dispatchService: configuration.directory.dispatchService
			,userServerUrl: options.userServerUrl
		});

		configuration.directory.dispatchSupport = new $n2.couchDispatchSupport.DispatchSupport({
			db: configuration.atlasDb
			,directory: configuration.directory
		});

		configuration.directory.languageService = new $n2.languageSupport.LanguageService({
			directory: configuration.directory
		});
		
		configuration.directory.attachmentService = new $n2.couchAttachment.AttachmentService({
			mediaRelativePath: options.mediaUrl
		});
		
		configuration.directory.showService = new $n2.couchShow.Show({
			db: configuration.atlasDb
			,documentSource: configuration.documentSource
			,requestService: configuration.directory.requestService
			,notifierService: configuration.directory.notifierService
			,dispatchService: configuration.directory.dispatchService
			,schemaRepository: configuration.directory.schemaRepository
			,customService: configuration.directory.customService
		});
		
		configuration.directory.createDocProcess = new $n2.couchRelatedDoc.CreateRelatedDocProcess({
			documentSource: configuration.documentSource
			,schemaRepository: configuration.directory.schemaRepository
			,uploadService: configuration.directory.uploadService
			,showService: configuration.directory.showService
			,authService: configuration.directory.authService
		});
		
	 	configuration.directory.userService = new $n2.couchUser.UserService({
			userDb: $n2.couch.getUserDb()
			,configService: configuration.directory.configService
			,schemaRepository: configuration.directory.schemaRepository
			,schemaEditorService: configuration.directory.schemaEditorService
			,userServerUrl: options.userServerUrl
		});

	 	configuration.contributions = new $n2.couchContributions({
			db: configuration.atlasDb
			,designDoc: configuration.atlasDesign
			,showService: configuration.directory.showService
			,uploads: configuration.directory.uploadService
		});
	 	
	 	$n2.mapAndControls.DefaultPopupHtmlFunction = function(opt_){
	 		var feature = opt_.feature;
	 		
	 		if( feature.cluster && feature.cluster.length === 1 ){
	 			feature = feature.cluster[0];
	 		};
	 		
	 		if( feature.cluster ){
				var $tmp = $('<span></span>');
				$tmp.text( _loc('This cluster contains {count} features',{
					count: feature.cluster.length
				}) );

		 		var $wrapper = $('<div></div>');
		 		$wrapper.append($tmp);
		 		var html = $wrapper.html();
		 		
		 		opt_.onSuccess(html);

	 		} else {
		 		var doc = opt_.feature.data;
		 		
		 		var $tmp = $('<span></span>');
		 		configuration.directory.showService.displayBriefDescription($tmp,{},doc);
		 		
		 		var $wrapper = $('<div></div>');
		 		$wrapper.append($tmp);
		 		var html = $wrapper.html();
		 		
		 		opt_.onSuccess(html);
	 		};
	 	};

	 	// Set up hover sound
	 	configuration.directory.hoverSoundService = new $n2.couchSound.HoverSoundService({
			db: configuration.atlasDb
			,serviceDirectory: configuration.directory
	 	});
		
		// Set up GeoNames service
		var geoNamesOptions = {};
		if( window.nunaliit_custom
		 && window.nunaliit_custom.geoNames ){
			if( window.nunaliit_custom.geoNames.username ){
				geoNamesOptions.username = window.nunaliit_custom.geoNames.username;
			};
		};
		configuration.directory.geoNamesService = new $n2.GeoNames.Service(geoNamesOptions);
		
		callCustomConfiguration();
	};
	
	function callCustomConfiguration(){
		if( window 
		 && window.nunaliit_custom 
		 && typeof(window.nunaliit_custom.configuration) === 'function' ){
			window.nunaliit_custom.configuration(configuration, configurationDone);
		} else {
			configurationDone();
		};
	};
	
	function configurationDone(){
		// Fix HTML from page
		if( configuration.directory.showService ){
			configuration.directory.showService.fixElementAndChildren( $('body') );
		};
		
		$n2.log('nunaliit configuration',configuration);
		options.onSuccess(configuration);
	};
};

$n2.staticConfiguration = {
	Configure: Configure
};

})(jQuery,nunaliit2);
