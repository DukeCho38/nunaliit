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

;(function($,$n2) {
"use strict";

var 
 _loc = function(str,args){ return $n2.loc(str,'nunaliit2',args); }
 ,DH = 'n2.modelTime'
 ;
 
//--------------------------------------------------------------------------
// This is a generic model that manages a time interval.
// It provides a time range and an interval.
//
// Subclasses should implement the method _intervalUpdated() to detect
// when the time interval is modified.
//
// Subclasses should call _addModelInfoParameters() to augment the model info
// message.
//
// Subclasses should call the method _setRange() to report the range reported by the
// documents.
var TimeIntervalModel = $n2.Class({
	
	dispatchService: null,
	
	modelId: null,
	
	autoRange: null,
	
	range: null,
	
	rangeParameter: null,
	
	interval: null,
	
	intervalParameter: null,
	
	now: null,
	
	initialize: function(opts_){
		var opts = $n2.extend({
			dispatchService: null
			,modelId: null
			,range: null
		},opts_);
		
		var _this = this;

		this.docInfosByDocId = {};
		this.now = Date.now();
		
		this.dispatchService = opts.dispatchService;
		this.modelId = opts.modelId;
		
		this.autoRange = true;
		if( opts.range ){
			this.range = $n2.date.parseUserDate(opts.range);
			if( this.range && this.range.ongoing ){
				this.range.ongoing = false;
				this.range.max = this.now;
			};
			this.interval = this.range;
			this.autoRange = false;
		};
		
		this.rangeParameter = new $n2.model.ModelParameter({
			model: this
			,modelId: this.modelId
			,type: 'dateInterval'
			,name: 'range'
			,label: _loc('Range')
			,setFn: this._setRange
			,getFn: this.getRange
			,dispatchService: this.dispatchService
		});
		
		this.intervalParameter = new $n2.model.ModelParameter({
			model: this
			,modelId: this.modelId
			,type: 'dateInterval'
			,name: 'interval'
			,label: _loc('Interval')
			,setFn: this._setInterval
			,getFn: this.getInterval
			,dispatchService: this.dispatchService
		});
	},
	
	getRange: function(){
		return this.range;
	},
	
	_setRange: function(updatedRange){
		var previous = this.getRange();
		
		this.range = updatedRange;
		if( this.range && this.range.ongoing ){
			this.range.max = this.now;
			this.range.ongoing = false;
		};
		
		var current = this.getRange();
		
		if( current === previous ){
			// Nothing to do. This takes care
			// of previous and current being null
		
		} else if( previous && previous.equals(current) ){
			// Nothing to do
		
		} else {
			// Range has changed
			this.rangeParameter.sendUpdate();
			
			// Verify if changes are required in interval
			// since interval should always be contained within
			// range.
			if( this.interval ){
				if( this.range ) {
					if( this.interval.min < this.range.min 
					 || this.interval.max > this.range.max ){
						// Need to fix interval
						var updatedInterval = this.range.intersection(this.interval);
						this._setInterval(updatedInterval);
					};
				} else {
					// Range is now null. Erase interval
					this._setInterval(null);
				};
			} else {
				// Range has changed. Since interval is null, then the interval
				// has also changed.
				this.intervalParameter.sendUpdate();
				
				// Check all documents to see if visibility has changed
				this._intervalUpdated();
			};
		};
	},
	
	getInterval: function(){
		if( this.interval ){
			return this.interval;
		};
		
		return this.range;
	},
	
	_setInterval: function(updatedInterval){
		var previous = this.getInterval();
		
		this.interval = updatedInterval;
		if( this.interval && this.interval.ongoing ){
			this.interval.max = this.now;
		};
		
		var current = this.getInterval();
		
		if( previous === current ) {
			// Nothing to do. This takes care of
			// previous and current being null
			
		} else if( previous && previous.equals(current) ){
			// Nothing to do
			
		} else {
			this.intervalParameter.sendUpdate();
			
			// Check all documents to see if visibility has changed
			this._intervalUpdated();
		};
	},
	
	_addModelInfoParameters: function(modelInfo){
		if( !modelInfo.parameters ){
			modelInfo.parameters = {};
		};
		
		modelInfo.parameters.range = this.rangeParameter.getInfo();
		modelInfo.parameters.interval = this.intervalParameter.getInfo();
	},
	
	_intervalUpdated: function(){
		throw new Error('Subclasses to TimeIntervalModel must implement _intervalUpdated()');
	}
});

//--------------------------------------------------------------------------
// This is a document filter model. In other words, it accepts documents from
// a source model and makes those documents available to listeners. Since it 
// is a filter, the documents are sent or not to downstream listeners based on
// a boolean function.
//
// This time filter retrieves all date structures in a document and create a set
// of intervals from them. The documents sent downstream are the one with intervals 
// that intersects the one reported by the model.
//
// If the option 'selectors' is specified, then only the portions of the document
// that correspond to the selectors are searched for date structure.
//
// If the option 'allowNoDate', if set, will not filter documents where no date structure
// are found. In other word, when 'allowNoDate' is set, documents that do not provide a date
// structure will not be filtered out and pass on to downstream listeners.
var TimeFilter = $n2.Class('TimeFilter',TimeIntervalModel,{
	
	sourceModelId: null,

	selectors: null,
	
	allowNoDate: null,
	
	docInfosByDocId: null,
	
	modelIsLoading: null,
	
	initialize: function(opts_){
		var opts = $n2.extend({
			sourceModelId: null
			,selectors: null
			,allowNoDate: false
		},opts_);
		
		TimeIntervalModel.prototype.initialize.apply(this,arguments);
		
		var _this = this;
		
		this.sourceModelId = opts.sourceModelId;
		this.allowNoDate = opts.allowNoDate;
		
		if( $n2.isArray(opts.selectors) ) {
			this.selectors = [];
			for(var i=0,e=opts.selectors.length; i<e; ++i){
				var sel = opts.selectors[i];
				if( typeof sel === 'string' ){
					sel = $n2.objectSelector.parseSelector(sel);
				};
				if( sel ){
					this.selectors.push(sel);
				};
			};
		} else {
			this.selectors = [
				new $n2.objectSelector.ObjectSelector([]) // root
			];
		};
		
		this.docInfosByDocId = {};
		this.modelIsLoading = false;
		
		// Register to events
		if( this.dispatchService ){
			var f = function(m, addr, dispatcher){
				_this._handle(m, addr, dispatcher);
			};
			this.dispatchService.register(DH, 'modelGetInfo', f);
			this.dispatchService.register(DH, 'modelGetState', f);
			this.dispatchService.register(DH, 'modelStateUpdated', f);
			
			// Initialize state
			var m = {
				type:'modelGetState'
				,modelId: this.sourceModelId
			};
			this.dispatchService.synchronousCall(DH, m);
			if( m.state ){
				this._sourceModelUpdated(m.state);
			};
		};
		
		$n2.log('TimeFilter',this);
	},
	
	_handle: function(m, addr, dispatcher){
		if( 'modelGetInfo' === m.type ){
			if( this.modelId === m.modelId ){
				m.modelInfo = this._getModelInfo();
			};
			
		} else if( 'modelGetState' === m.type ){
			if( this.modelId === m.modelId ){
				var added = [];
				for(var docId in this.docInfosByDocId){
					var docInfo = this.docInfosByDocId[docId];
					var doc = docInfo.doc;
					if( docInfo.visible ){
						added.push(doc);
					};
				};

				m.state = {
					added: added
					,updated: []
					,removed: []
					,loading: this.modelIsLoading
				};
			};
			
		} else if( 'modelStateUpdated' === m.type ){
			// Does it come from our source?
			if( this.sourceModelId === m.modelId ){
				this._sourceModelUpdated(m.state);
			};
		};
	},

	_getModelInfo: function(){
		var info = {
			modelId: this.modelId
			,modelType: 'timeFilter'
			,parameters: {}
		};
		
		this._addModelInfoParameters(info);
		
		return info;
	},
	
	_sourceModelUpdated: function(sourceState){
		var added = []
			,updated = []
			,removed = []
			;
		
		var now = Date.now();
		
		if( typeof sourceState.loading === 'boolean' 
		 && this.modelIsLoading !== sourceState.loading ){
			this.modelIsLoading = sourceState.loading;
		};
		
		// Loop through all added documents
		if( sourceState.added ){
			for(var i=0,e=sourceState.added.length; i<e; ++i){
				var doc = sourceState.added[i];
				var docId = doc._id;
				var intervals = this._getTimeIntervalsFromDoc(doc);
				var docInfo = {
					id: docId
					,doc: doc
					,intervals: intervals
					,visible: false
				};
				
				// Compute new visibility
				var visibility = this._computeVisibility(docInfo, now);
				
				docInfo.visible = visibility;

				// Save info
				this.docInfosByDocId[docId] = docInfo;
				
				if( docInfo.visible ){
					added.push(doc);
				};
			};
		};
		
		// Loop through all updated documents
		if( sourceState.updated ){
			for(var i=0,e=sourceState.updated.length; i<e; ++i){
				var doc = sourceState.updated[i];
				var docId = doc._id;
				var docInfo = this.docInfosByDocId[docId];
				var intervals = this._getTimeIntervalsFromDoc(doc);
				if( !docInfo ) {
					docInfo = {
						id: docId
						,doc: doc
						,visible: false
					};
					this.docInfosByDocId[docId] = docInfo;
				};

				// Update
				docInfo.doc = doc;
				docInfo.intervals = intervals;
				
				// Compute new visibility
				var visibility = this._computeVisibility(docInfo, now);
				var changeInVisibility = ( visibility !== docInfo.visible );
				docInfo.visible = visibility;

				// Report change in visibility
				if( changeInVisibility ){
					
					if( docInfo.visible ){
						// It used to be hidden. Now, it is visible. Add
						added.push(doc);
					} else {
						// It used to be visible. Now, it is hidden. Remove
						removed.push(doc);
					};
					
				} else if( docInfo.visible ) {
					// In this case, there was an update and it used to
					// be visible and it is still visible. Report update
					updated.push(doc);
				};
			};
		};
		
		// Loop through all removed documents
		if( sourceState.removed ){
			for(var i=0,e=sourceState.removed.length; i<e; ++i){
				var doc = sourceState.removed[i];
				var docId = doc._id;
				var docInfo = this.docInfosByDocId[docId];
				if( docInfo ){
					delete this.docInfosByDocId[docId];
					
					// If previously visible, add to removal list
					if( docInfo.visible ){
						removed.push(doc);
					};
				};
			};
		};

		// Report changes in visibility
		this._reportStateUpdate(added, updated, removed);

		// Recompute range, if necessary
		if( this.autoRange ){
			var updatedRange = null;
			for(var docId in this.docInfosByDocId){
				var docInfo = this.docInfosByDocId[docId];
				if( docInfo 
				 && docInfo.intervals  ){
					
					for(var i=0,e=docInfo.intervals.length; i<e; ++i){
						var interval = docInfo.intervals[i];
						
						if( !updatedRange ){
							updatedRange = interval;
						} else {
							updatedRange = updatedRange.extendTo(interval, now);
						};
					};
				};
			};
			
			if( updatedRange ){
				var updatedMin = updatedRange.getMin();
				var updatedMax = updatedRange.getMax(now);

				if( this.range ) {
					if( updatedMin != this.range.getMin() 
					 || updatedMax != this.range.getMax(now) ){
						updatedRange = new $n2.date.DateInterval({
							min: updatedMin
							,max: updatedMax
							,ongoing: false
						});
						this._setRange(updatedRange);
					};
				} else {
					updatedRange = new $n2.date.DateInterval({
						min: updatedMin
						,max: updatedMax
						,ongoing: false
					});
					this._setRange(updatedRange);
				};
			} else {
				// No longer any document with a date
				this._setRange(null);
			};
		};
	},
	
	_intervalUpdated: function(){
		var added = []
			,updated = []
			,removed = []
			;
		
		var now = Date.now();
		
		// Loop through all documents
		for(var docId in this.docInfosByDocId){
			var docInfo = this.docInfosByDocId[docId];
			var doc = docInfo.doc;

			// Compute new visibility
			var visibility = this._computeVisibility(docInfo, now);
			var changeInVisibility = ( visibility !== docInfo.visible );
			docInfo.visible = visibility;

			// Report change in visibility
			if( changeInVisibility ){
				
				if( docInfo.visible ){
					// It used to be hidden. Now, it is visible. Add
					added.push(doc);
				} else {
					// It used to be visible. Now, it is hidden. Remove
					removed.push(doc);
				};
			};
		};
		
		this._reportStateUpdate(added, updated, removed);
	},
	
	_reportStateUpdate: function(added, updated, removed){
		var stateUpdate = {
			added: added
			,updated: updated
			,removed: removed
			,loading: this.modelIsLoading
		};

		if( this.dispatchService ){
			this.dispatchService.send(DH,{
				type: 'modelStateUpdated'
				,modelId: this.modelId
				,state: stateUpdate
			});
		};
	},
	
	_computeVisibility: function(docInfo, now){
		var filterInterval = this.getInterval();
		
		if( docInfo 
		 && docInfo.intervals ) {
			 if( docInfo.intervals.length > 0 
			  && filterInterval ){
				
				for(var i=0,e=docInfo.intervals.length; i<e; ++i){
					var interval = docInfo.intervals[i];
					
					if( interval.intersectsWith(filterInterval, now) ){
						return true;
					};
				};

			 } else if( docInfo.intervals.length < 1 
					 && this.allowNoDate ){
				 return true;
			};
		};
		
		return false;
	},
	
	_getTimeIntervalsFromDoc: function(doc){
		var intervals = [];
		
		for(var i=0,e=this.selectors.length; i<e; ++i){
			var selector = this.selectors[i];
			selector.traverse(doc,function(value, sel){
				if( typeof value === 'object' 
				 && null !== value 
				 && value.nunaliit_type === 'date'
				 && typeof value.date === 'string' ){
					// is a date
					var interval = $n2.date.parseDateStructure(value);
					if( interval ){
						intervals.push( interval );
					};
				};
			});
		};
		
		return intervals;
	}
});

// --------------------------------------------------------------------------
// This is a document transform model. In other words, it accepts documents from
// another model and makes those documents available to listeners. Since it is a
// transform, it modifies the document contents before passing them on.
//
// This time transform retrieves all date structures in a document and create a set
// of intervals from them. The documents sent downstream are updated with an attribute
// reporting how well the intervals match the time interval reported by the model.
//
// The attribute added by this transform has the following format:
// {
//    _n2TimeTransform: {
//       intersects: <boolean> Set if the document intersects with the model interval
//       ,intervalSize: <number> Size of the time interval reported by the document
//        ,filterIntervalSize: <number> Size of the time interval reported by the model
//       ,intersectionSize: <number> Size of the intersection between the time interval 
//                                   reported by the document and the one reported by the
//                                   model
//    }
// }
var TimeTransform = $n2.Class('TimeTransform',TimeIntervalModel,{
	
	sourceModelId: null,
	
	docInfosByDocId: null,
	
	modelIsLoading: null,
	
	initialize: function(opts_){
		var opts = $n2.extend({
			sourceModelId: null
		},opts_);
		
		TimeIntervalModel.prototype.initialize.apply(this,arguments);
		
		var _this = this;
		
		this.sourceModelId = opts.sourceModelId;
		this.docInfosByDocId = {};
		this.modelIsLoading = false;
		this.now = Date.now();
		
		// Register to events
		if( this.dispatchService ){
			var f = function(m, addr, dispatcher){
				_this._handle(m, addr, dispatcher);
			};
			this.dispatchService.register(DH, 'modelGetInfo', f);
			this.dispatchService.register(DH, 'modelGetState', f);
			this.dispatchService.register(DH, 'modelStateUpdated', f);
			
			// Initialize state
			var m = {
				type:'modelGetState'
				,modelId: this.sourceModelId
			};
			this.dispatchService.synchronousCall(DH, m);
			if( m.state ){
				this._sourceModelUpdated(m.state);
			};
		};
		
		$n2.log('TimeTransform',this);
	},
	
	_handle: function(m, addr, dispatcher){
		if( 'modelGetInfo' === m.type ){
			if( this.modelId === m.modelId ){
				m.modelInfo = this._getModelInfo();
			};
			
		} else if( 'modelGetState' === m.type ){
			// Is this request intended for this time transform?
			if( this.modelId === m.modelId ){
				var added = [];
				for(var docId in this.docInfosByDocId){
					var docInfo = this.docInfosByDocId[docId];
					var doc = docInfo.doc;
					added.push(doc);
				};

				m.state = {
					added: added
					,updated: []
					,removed: []
					,loading: this.modelIsLoading
				};
			};
			
		} else if( 'modelStateUpdated' === m.type ){
			// Does it come from our source?
			if( this.sourceModelId === m.modelId ){
				this._sourceModelUpdated(m.state);
			};
		};
	},

	_getModelInfo: function(){
		var info = {
			modelId: this.modelId
			,modelType: 'timeTransform'
			,parameters: {}
		};
		
		this._addModelInfoParameters(info);
		
		return info;
	},
	
	_sourceModelUpdated: function(sourceState){
		var added = []
			,updated = []
			,removed = []
			;
		
		var _this = this;
		
		if( typeof sourceState.loading === 'boolean' 
		 && this.modelIsLoading !== sourceState.loading ){
			this.modelIsLoading = sourceState.loading;
		};
		
		// Loop through all added documents
		if( sourceState.added ){
			for(var i=0,e=sourceState.added.length; i<e; ++i){
				var doc = sourceState.added[i];
				var docId = doc._id;

				var docInfo = createDocInfo(doc);

				// Save info
				this.docInfosByDocId[docId] = docInfo;
				
				added.push(docInfo.doc);
			};
		};
		
		// Loop through all updated documents
		if( sourceState.updated ){
			for(var i=0,e=sourceState.updated.length; i<e; ++i){
				var doc = sourceState.updated[i];
				var docId = doc._id;
				var docInfo = this.docInfosByDocId[docId];
				if( !docInfo ) {
					// Added
					var docInfo = createDocInfo(doc);

					// Save info
					this.docInfosByDocId[docId] = docInfo;
					
					added.push(docInfo.doc);

				} else {
					// Updated
					var intervals = this._getTimeIntervalsFromDoc(doc);
					var transform = this._computeTransform(intervals, this.now);
					
					var myDoc = {
						_n2TimeTransform: transform
					};
					for(var key in doc){
						myDoc[key] = doc[key];
					};

					// Update
					docInfo.doc = myDoc;
					docInfo.intervals = intervals;
					
					updated.push(docInfo.doc);
				};
			};
		};
		
		// Loop through all removed documents
		if( sourceState.removed ){
			for(var i=0,e=sourceState.removed.length; i<e; ++i){
				var doc = sourceState.removed[i];
				var docId = doc._id;
				var docInfo = this.docInfosByDocId[docId];
				if( docInfo ){
					delete this.docInfosByDocId[docId];
					
					removed.push(doc);
				};
			};
		};

		// Report changes in visibility
		this._reportStateUpdate(added, updated, removed);

		// Recompute range, if necessary
		if( this.autoRange ){
			var updatedRange = null;
			for(var docId in this.docInfosByDocId){
				var docInfo = this.docInfosByDocId[docId];
				if( docInfo 
				 && docInfo.intervals  ){
					
					for(var i=0,e=docInfo.intervals.length; i<e; ++i){
						var interval = docInfo.intervals[i];
						
						if( !updatedRange ){
							updatedRange = interval;
						} else {
							updatedRange = updatedRange.extendTo(interval, this.now);
						};
					};
				};
			};
			
			if( updatedRange ){
				var updatedMin = updatedRange.getMin();
				var updatedMax = updatedRange.getMax(this.now);

				if( this.range ) {
					if( updatedMin != this.range.getMin() 
					 || updatedMax != this.range.getMax(this.now) ){
						updatedRange = new $n2.date.DateInterval({
							min: updatedMin
							,max: updatedMax
							,ongoing: false
						});
						this._setRange(updatedRange);
					};
				} else {
					updatedRange = new $n2.date.DateInterval({
						min: updatedMin
						,max: updatedMax
						,ongoing: false
					});
					this._setRange(updatedRange);
				};
			} else {
				// No longer any document with a date
				this._setRange(null);
			};
		};
		
		function createDocInfo(doc){
			var docId = doc._id;
			var intervals = _this._getTimeIntervalsFromDoc(doc);
			var transform = _this._computeTransform(intervals, _this.now);
			
			var myDoc = {
				_n2TimeTransform: transform
			};
			for(var key in doc){
				myDoc[key] = doc[key];
			};
			
			var docInfo = {
				id: docId
				,doc: myDoc
				,intervals: intervals
			};
			
			return docInfo;
		};
	},
	
	_intervalUpdated: function(){
		var added = []
			,updated = []
			,removed = []
			;
		
		// Loop through all documents
		for(var docId in this.docInfosByDocId){
			var docInfo = this.docInfosByDocId[docId];
			var doc = docInfo.doc;

			// Compute new visibility
			var intervals = docInfo.intervals;
			var updatedTransform = this._computeTransform(intervals, this.now);
			var transformsEqual = this._areTransformsEqual(updatedTransform, doc._n2TimeTransform);
			if( !transformsEqual ){
				doc._n2TimeTransform = updatedTransform;
				updated.push(doc);
			};
		};
		
		this._reportStateUpdate(added, updated, removed);
	},
	
	_reportStateUpdate: function(added, updated, removed){
		var stateUpdate = {
			added: added
			,updated: updated
			,removed: removed
			,loading: this.modelIsLoading
		};

		if( this.dispatchService ){
			this.dispatchService.send(DH,{
				type: 'modelStateUpdated'
				,modelId: this.modelId
				,state: stateUpdate
			});
		};
	},
	
	_computeTransform: function(intervals, now){
		var filterInterval = this.getInterval();
		
		var intersects = false;
		var intervalSize = 0;
		var intersectionSize = 0;
		var filterIntervalSize = 0;
		
		if( filterInterval ){
			filterIntervalSize = filterInterval.size(now);
			
			if( intervals ){
				for(var i=0,e=intervals.length; i<e; ++i){
					var interval = intervals[i];
					
					intervalSize += interval.size(now);
					
					var intersection = interval.intersection(filterInterval, now);
					if( intersection ){
						intersects = true;
						
						intersectionSize += intersection.size(now);
					};
				};
			};
		};
		
		if( !intersects ){
			filterIntervalSize = 0;
		};
		
		var transform = {
			intersects: intersects
			,intervalSize: intervalSize
			,intersectionSize: intersectionSize
			,filterIntervalSize: filterIntervalSize
		};
		
		return transform;
	},
	
	_areTransformsEqual: function(t1,t2){
		if( t1 === t2 ){
			return true;
			
		} else if( !t1 ) {
			return false;
			
		} else if( !t2 ) {
			return false;
		};

		if( t1.intersects !== t2.intersects ) return false;
		if( t1.intervalSize !== t2.intervalSize ) return false;
		if( t1.intersectionSize !== t2.intersectionSize ) return false;
		if( t1.filterIntervalSize !== t2.filterIntervalSize ) return false;
		
		return true;
	},
	
	_getTimeIntervalsFromDoc: function(doc){
		var dates = [];
		$n2.couchUtils.extractSpecificType(doc,'date',dates);
		
		var intervals = [];
		for(var i=0,e=dates.length; i<e; ++i){
			var date = dates[i];
			var interval = $n2.date.parseDateStructure(date);
			if( interval ){
				intervals.push( interval );
			};
		};
		
		return intervals;
	}
});

// --------------------------------------------------------------------------
// This is a document transform model. In other words, it accepts documents from
// another model and makes those documents available to listeners. Since it is a
// transform, it modifies the document contents before passing them on.
//
// A dated reference is a reference object that contains a dated. The reference is
// valid only for the specified time interval. A dated reference has the following
// format:
// {
//     nunaliit_type: "reference"
//     ,doc: <string, identifier of referenced document>
//     ,date: {
//        nunaliit_type: "date"
//        ,date: <string>
//        ,min: <number>
//        ,max: <number>
//        ,ongoing: <boolean>
//     }
// }
//
// This time transform removes the references from documents when they do not match
// the selected time interval.
//
// This class uses a dictionay to track all documents received from the source model
// docInfosByDocId = {
//    <docId>: {
//       id: <string> identifier for document
//       ,doc: <object> transformed document
//       ,originalDoc: <object> document received from source model
//    }
// }
var DatedReferenceTransform = $n2.Class('DatedReferenceTransform',TimeIntervalModel,{
	
	sourceModelId: null,
	
	docInfosByDocId: null,
	
	modelIsLoading: null,
	
	initialize: function(opts_){
		var opts = $n2.extend({
			sourceModelId: null
		},opts_);
		
		TimeIntervalModel.prototype.initialize.apply(this,arguments);
		
		var _this = this;

		this.docInfosByDocId = {};
		this.modelIsLoading = false;
		
		this.sourceModelId = opts.sourceModelId;
		
		// Register to events
		if( this.dispatchService ){
			var f = function(m, addr, dispatcher){
				_this._handle(m, addr, dispatcher);
			};
			this.dispatchService.register(DH,'modelGetInfo',f);
			this.dispatchService.register(DH, 'modelGetState', f);
			this.dispatchService.register(DH, 'modelStateUpdated', f);
			
			// Initialize state
			var m = {
				type:'modelGetState'
				,modelId: this.sourceModelId
			};
			this.dispatchService.synchronousCall(DH, m);
			if( m.state ){
				this._sourceModelUpdated(m.state);
			};
		};
		
		$n2.log('DatedReferenceTransform',this);
	},
	
	_handle: function(m, addr, dispatcher){
		if( 'modelGetInfo' === m.type ){
			if( this.modelId === m.modelId ){
				m.modelInfo = this._getModelInfo();
			};
			
		} else if( 'modelGetState' === m.type ){
			// Is this request intended for this time transform?
			if( this.modelId === m.modelId ){
				var added = [];
				for(var docId in this.docInfosByDocId){
					var docInfo = this.docInfosByDocId[docId];
					var doc = docInfo.doc;
					added.push(doc);
				};

				m.state = {
					added: added
					,updated: []
					,removed: []
					,loading: this.modelIsLoading
				};
			};
			
		} else if( 'modelStateUpdated' === m.type ){
			// Does it come from our source?
			if( this.sourceModelId === m.modelId ){
				this._sourceModelUpdated(m.state);
			};
		};
	},

	_getModelInfo: function(){
		var info = {
			modelId: this.modelId
			,modelType: 'datedReferenceTransform'
			,parameters: {}
		};
		
		this._addModelInfoParameters(info);
		
		return info;
	},
	
	_sourceModelUpdated: function(sourceState){
		var added = []
			,updated = []
			,removed = []
			;
		
		var _this = this;
		
		if( typeof sourceState.loading === 'boolean'
		 && this.modelIsLoading !== sourceState.loading ){
			this.modelIsLoading = sourceState.loading;
		};
		
		// Loop through all added documents
		if( sourceState.added ){
			for(var i=0,e=sourceState.added.length; i<e; ++i){
				var doc = sourceState.added[i];
				var docId = doc._id;

				var docInfo = createDocInfo(doc);

				// Save info
				this.docInfosByDocId[docId] = docInfo;
				
				added.push(docInfo.doc);
			};
		};
		
		// Loop through all updated documents
		if( sourceState.updated ){
			for(var i=0,e=sourceState.updated.length; i<e; ++i){
				var doc = sourceState.updated[i];
				var docId = doc._id;
				var docInfo = this.docInfosByDocId[docId];
				if( !docInfo ) {
					// Added
					var docInfo = createDocInfo(doc);

					// Save info
					this.docInfosByDocId[docId] = docInfo;
					
					added.push(docInfo.doc);

				} else {
					// Updated
					var intervalInfos = this._getIntervalInfosFromDoc(doc);
					var myDoc = this._computeTransform(doc, intervalInfos);
					
					docInfo.sourceDoc = doc;
					docInfo.doc = myDoc;
					docInfo.intervalInfos = intervalInfos;
					
					updated.push(docInfo.doc);
				};
			};
		};
		
		// Loop through all removed documents
		if( sourceState.removed ){
			for(var i=0,e=sourceState.removed.length; i<e; ++i){
				var doc = sourceState.removed[i];
				var docId = doc._id;
				var docInfo = this.docInfosByDocId[docId];
				if( docInfo ){
					delete this.docInfosByDocId[docId];
					
					removed.push(doc);
				};
			};
		};

		// Report changes in visibility
		this._reportStateUpdate(added, updated, removed);

		// Recompute range, if necessary
		if( this.autoRange ){
			var updatedRange = null;
			for(var docId in this.docInfosByDocId){
				var docInfo = this.docInfosByDocId[docId];
				if( docInfo 
				 && docInfo.intervalInfos  ){
					
					for(var i=0,e=docInfo.intervalInfos.length; i<e; ++i){
						var intervalInfo = docInfo.intervalInfos[i];
						var interval = intervalInfo.interval;
						
						if( !updatedRange ){
							updatedRange = interval;
						} else {
							updatedRange = updatedRange.extendTo(interval, this.now);
						};
					};
				};
			};
			
			if( updatedRange ){
				var updatedMin = updatedRange.getMin();
				var updatedMax = updatedRange.getMax(this.now);

				if( this.range ) {
					if( updatedMin != this.range.getMin() 
					 || updatedMax != this.range.getMax(this.now) ){
						updatedRange = new $n2.date.DateInterval({
							min: updatedMin
							,max: updatedMax
							,ongoing: false
						});
						this._setRange(updatedRange);
					};
				} else {
					updatedRange = new $n2.date.DateInterval({
						min: updatedMin
						,max: updatedMax
						,ongoing: false
					});
					this._setRange(updatedRange);
				};
			} else {
				// No longer any document with a date
				this._setRange(null);
			};
		};
		
		function createDocInfo(sourceDoc){
			var docId = doc._id;
			var intervalInfos = _this._getIntervalInfosFromDoc(sourceDoc);

			var myDoc = _this._computeTransform(sourceDoc, intervalInfos);
			
			var docInfo = {
				id: docId
				,doc: myDoc
				,sourceDoc: sourceDoc
				,intervalInfos: intervalInfos
			};
			
			return docInfo;
		};
	},
	
	_intervalUpdated: function(){
		var added = []
			,updated = []
			,removed = []
			;
		
		var filterInterval = this.getInterval();
		
		// Loop through all documents
		for(var docId in this.docInfosByDocId){
			var docInfo = this.docInfosByDocId[docId];
			var doc = docInfo.doc;

			// Compute changes in transforms
			var transformChanged = false;
			var intervalInfos = docInfo.intervalInfos;
			for(var i=0,e=intervalInfos.length; i<e; ++i){
				var intervalInfo = intervalInfos[i];
				var interval = intervalInfo.interval;
				
				var visible = false;
				if( filterInterval && filterInterval.intersectsWith(interval, this.now) ){
					visible = true;
				};
				
				if( intervalInfo.visible !== visible ){
					transformChanged = true;
					intervalInfo.visible = visible;
				};
			};

			// Recompute transform document, if needed
			if( transformChanged ){
				var myDoc = this._computeTransform(docInfo.sourceDoc, intervalInfos);
				docInfo.doc = myDoc;
				updated.push(myDoc);
			};
		};
		
		this._reportStateUpdate(added, updated, removed);
	},
	
	_reportStateUpdate: function(added, updated, removed){
		var stateUpdate = {
			added: added
			,updated: updated
			,removed: removed
			,loading: this.modelIsLoading
		};

		if( this.dispatchService ){
			this.dispatchService.send(DH,{
				type: 'modelStateUpdated'
				,modelId: this.modelId
				,state: stateUpdate
			});
		};
	},
	
	_computeTransform: function(sourceDoc, intervalInfos){
		var myDoc = $n2.extend(true, {}, sourceDoc);
		
		for(var i=0,e=intervalInfos.length; i<e; ++i){
			var intervalInfo = intervalInfos[i];
			if( intervalInfo.visible ){
				// OK
			} else {
				// Remove this reference. Replace it with null
				intervalInfo.selector.setValue(myDoc, null);
			};
		};

		return myDoc;
	},
	
	_getIntervalInfosFromDoc: function(doc){
		var currentInterval = this.getInterval();

		// Find selectors for all dated reference
		var selectors = $n2.objectSelector.findSelectors(doc, function(v){
			if( null !== v 
			 && typeof v === 'object' ){
				if( v.nunaliit_type === 'reference' 
				 && v.date 
				 && v.date.nunaliit_type === 'date' ){
					return true;
				};
			};
			return false;
		});
		
		// Compute interval infos
		var intervalInfos = [];
		for(var i=0,e=selectors.length; i<e; ++i){
			var selector = selectors[i];
			var ref = selector.getValue(doc);
			var dateStr = ref.date;
			var interval = $n2.date.parseDateStructure(dateStr);
			if( interval ){
				var intervalInfo = {
					interval: interval
					,selector: selector
					,visible: false
				};
				
				if( currentInterval ){
					if( currentInterval.intersectsWith(interval, this.now) ){
						intervalInfo.visible = true;
					};
				};
				
				intervalInfos.push( intervalInfo );
			};
		};

		return intervalInfos;
	}
});

//--------------------------------------------------------------------------
// No time filter.
// This is a document filter that allows through documents that do not contain
// any time intervals.
var NoTimeFilter = $n2.Class({
	
	dispatchService: null,
	
	modelId: null,
	
	sourceModelId: null,
	
	docInfosByDocId: null,
	
	modelIsLoading: null,
	
	initialize: function(opts_){
		var opts = $n2.extend({
			dispatchService: null
			,modelId: null
			,sourceModelId: null
		},opts_);
		
		var _this = this;
		
		this.dispatchService = opts.dispatchService;
		this.modelId = opts.modelId;
		this.sourceModelId = opts.sourceModelId;
		
		this.docInfosByDocId = {};
		this.modelIsLoading = false;
		
		// Register to events
		if( this.dispatchService ){
			var f = function(m, addr, dispatcher){
				_this._handle(m, addr, dispatcher);
			};
			this.dispatchService.register(DH,'modelGetInfo',f);
			this.dispatchService.register(DH, 'modelGetState', f);
			this.dispatchService.register(DH, 'modelStateUpdated', f);
			
			// Initialize state
			var m = {
				type:'modelGetState'
				,modelId: this.sourceModelId
			};
			this.dispatchService.synchronousCall(DH, m);
			if( m.state ){
				this._sourceModelUpdated(m.state);
			};
		};
		
		$n2.log('NoTimeFilter',this);
	},
	
	_handle: function(m, addr, dispatcher){
		if( 'modelGetInfo' === m.type ){
			if( this.modelId === m.modelId ){
				m.modelInfo = this._getModelInfo();
			};
			
		} else if( 'modelGetState' === m.type ){
			if( this.modelId === m.modelId ){
				var added = [];
				for(var docId in this.docInfosByDocId){
					var docInfo = this.docInfosByDocId[docId];
					var doc = docInfo.doc;
					if( docInfo.visible ){
						added.push(doc);
					};
				};

				m.state = {
					added: added
					,updated: []
					,removed: []
					,loading: this.modelIsLoading
				};
			};
			
		} else if( 'modelStateUpdated' === m.type ){
			// Does it come from our source?
			if( this.sourceModelId === m.modelId ){
				this._sourceModelUpdated(m.state);
			};
		};
	},
	
	_getModelInfo: function(){
		var info = {
			modelId: this.modelId
			,modelType: 'noTimeFilter'
			,parameters: {}
		};
		
		return info;
	},
	
	_sourceModelUpdated: function(sourceState){
		var added = []
			,updated = []
			,removed = []
			;
		
		if( typeof sourceState.loading === 'boolean' 
		 && this.modelIsLoading !== sourceState.loading ){
			this.modelIsLoading = sourceState.loading;
		};
		
		// Loop through all added documents
		if( sourceState.added ){
			for(var i=0,e=sourceState.added.length; i<e; ++i){
				var doc = sourceState.added[i];
				var docId = doc._id;
				var intervals = this._getTimeIntervalsFromDoc(doc);
				var docInfo = {
					id: docId
					,doc: doc
					,intervals: intervals
					,visible: false
				};
				
				// Compute new visibility
				var visibility = this._computeVisibility(docInfo);
				
				docInfo.visible = visibility;

				// Save info
				this.docInfosByDocId[docId] = docInfo;
				
				if( docInfo.visible ){
					added.push(doc);
				};
			};
		};
		
		// Loop through all updated documents
		if( sourceState.updated ){
			for(var i=0,e=sourceState.updated.length; i<e; ++i){
				var doc = sourceState.updated[i];
				var docId = doc._id;
				var docInfo = this.docInfosByDocId[docId];
				var intervals = this._getTimeIntervalsFromDoc(doc);
				if( !docInfo ) {
					docInfo = {
						id: docId
						,doc: doc
						,visible: false
					};
					this.docInfosByDocId[docId] = docInfo;
				};

				// Update
				docInfo.doc = doc;
				docInfo.intervals = intervals;
				
				// Compute new visibility
				var visibility = this._computeVisibility(docInfo);
				var changeInVisibility = ( visibility !== docInfo.visible );
				docInfo.visible = visibility;

				// Report change in visibility
				if( changeInVisibility ){
					
					if( docInfo.visible ){
						// It used to be hidden. Now, it is visible. Add
						added.push(doc);
					} else {
						// It used to be visible. Now, it is hidden. Remove
						removed.push(doc);
					};
					
				} else if( docInfo.visible ) {
					// In this case, there was an update and it used to
					// be visible and it is still visible. Report update
					updated.push(doc);
				};
			};
		};
		
		// Loop through all removed documents
		if( sourceState.removed ){
			for(var i=0,e=sourceState.removed.length; i<e; ++i){
				var doc = sourceState.removed[i];
				var docId = doc._id;
				var docInfo = this.docInfosByDocId[docId];
				if( docInfo ){
					delete this.docInfosByDocId[docId];
					
					// If previously visible, add to removal list
					if( docInfo.visible ){
						removed.push(doc);
					};
				};
			};
		};

		// Report changes in visibility
		this._reportStateUpdate(added, updated, removed);
	},
	
	_reportStateUpdate: function(added, updated, removed){
		var stateUpdate = {
			added: added
			,updated: updated
			,removed: removed
			,loading: this.modelIsLoading
		};

		if( this.dispatchService ){
			this.dispatchService.send(DH,{
				type: 'modelStateUpdated'
				,modelId: this.modelId
				,state: stateUpdate
			});
		};
	},
	
	_computeVisibility: function(docInfo){

		if( docInfo 
		 && docInfo.intervals
		 && docInfo.intervals.length > 0 ){
			// Any time interval makes the document invisible
			return false;
		};
		
		return true;
	},
	
	_getTimeIntervalsFromDoc: function(doc){
		var dates = [];
		$n2.couchUtils.extractSpecificType(doc,'date',dates);
		
		var intervals = [];
		for(var i=0,e=dates.length; i<e; ++i){
			var date = dates[i];
			var interval = $n2.date.parseDateStructure(date);
			if( interval ){
				intervals.push( interval );
			};
		};
		
		return intervals;
	}
});

//--------------------------------------------------------------------------
// This is a not a document model. This model does not provide any document to
// listeners.
//
// Instead, this model monitors other time models and unifies the range/intervals
// reported by them.
//
// This model monitors the range intervals reported by all source models, merges
// those intervals and report the result to the listeners. It ignores requests to change
// the range.
// 
var TimeSynchronize = $n2.Class('TimeSynchronize',{
	
	dispatchService: null,
	
	modelId: null,

	rangeChangeEvent: null,

	rangeSetEvent: null,
	
	rangeGetEvent: null,
	
	currentRange: null,

	intervalChangeEvent: null,

	intervalSetEvent: null,
	
	intervalGetEvent: null,
	
	currentInterval: null,
	
	sourceModelsById: null,
	
	now: null,
	
	initialize: function(opts_){
		var opts = $n2.extend({
			dispatchService: null
			,modelId: null
			,sourceModelIds: null
		},opts_);
		
		var _this = this;
		
		this.sourceModelsById = {};

		this.dispatchService = opts.dispatchService;
		this.modelId = opts.modelId;
		this.now = Date.now();
		
		this.rangeChangeEvent = this.modelId + '_range_change_event';
		this.rangeSetEvent = this.modelId + '_range_set_event';
		this.rangeGetEvent = this.modelId + '_range_get_event';

		this.intervalChangeEvent = this.modelId + '_interval_change_event';
		this.intervalSetEvent = this.modelId + '_interval_set_event';
		this.intervalGetEvent = this.modelId + '_interval_get_event';
		
		if( this.dispatchService ){
			var fn = function(m, addr, dispatcher){
				_this._handle(m, addr, dispatcher);
			};
			
			this.dispatchService.register(DH, 'modelGetInfo', fn);
			this.dispatchService.register(DH, this.rangeGetEvent, fn);
			this.dispatchService.register(DH, this.intervalSetEvent, fn);
			this.dispatchService.register(DH, this.intervalGetEvent, fn);

			if( $n2.isArray(opts.sourceModelIds)  ){
				// Register change events with source models
				for(var i=0,e=opts.sourceModelIds.length; i<e; ++i){
					var sourceModelId = opts.sourceModelIds[i];
					if( sourceModelId && typeof sourceModelId === 'string' ){
						var sourceModelInfo = {
							id: sourceModelId
						};
						this.sourceModelsById[sourceModelId] = sourceModelInfo;
						
						// Get model info
						var modelInfoRequest = {
							type: 'modelGetInfo'
							,modelId: sourceModelId
							,modelInfo: null
						};
						this.dispatchService.synchronousCall(DH, modelInfoRequest);
						var modelInfo = modelInfoRequest.modelInfo;
						
						if( modelInfo 
						 && modelInfo.parameters 
						 && modelInfo.parameters.range ){
							var paramInfo = modelInfo.parameters.range;
							sourceModelInfo.rangeChangeEventName = paramInfo.changeEvent;
							sourceModelInfo.rangeGetEventName = paramInfo.getEvent;
							sourceModelInfo.rangeSetEventName = paramInfo.setEvent;
							
							var parameterId = paramInfo.parameterId;
							if( parameterId ){
								this.sourceModelsById[parameterId] = sourceModelInfo;
							};
	
							if( paramInfo.value ){
								sourceModelInfo.range = paramInfo.value;
							};
						};
						
						if( modelInfo 
						 && modelInfo.parameters 
						 && modelInfo.parameters.interval ){
							var paramInfo = modelInfo.parameters.interval;
							sourceModelInfo.intervalChangeEventName = paramInfo.changeEvent;
							sourceModelInfo.intervalGetEventName = paramInfo.getEvent;
							sourceModelInfo.intervalSetEventName = paramInfo.setEvent;
	
							var parameterId = paramInfo.parameterId;
							if( parameterId ){
								this.sourceModelsById[parameterId] = sourceModelInfo;
							};
	
							if( paramInfo.value ){
								sourceModelInfo.interval = paramInfo.value;
							};
						};
						
						if( sourceModelInfo.rangeChangeEventName ){
							this.dispatchService.register(DH, sourceModelInfo.rangeChangeEventName, fn);
						};
						
						if( sourceModelInfo.intervalChangeEventName ){
							this.dispatchService.register(DH, sourceModelInfo.intervalChangeEventName, fn);
						};
					};
				};
			};
		};
		
		// Report current values
		this._recomputeRange();
		
		$n2.log('TimeSynchronize',this);
	},
	
	_handle: function(m, addr, dispatcher){
		if( 'modelGetInfo' === m.type ){
			if( this.modelId === m.modelId ){
				m.modelInfo = this._getModelInfo();
			};
			
		} else if( this.rangeGetEvent === m.type ){
			m.value = this.currentRange;

		} else if( this.intervalGetEvent === m.type ){
			m.value = this.currentInterval;

		} else if( this.intervalSetEvent === m.type ){
			var value = m.value;
			this._setInterval(value);

		} else if( m.parameterId 
		 && this.sourceModelsById[m.parameterId] ){
			var sourceModelInfo = this.sourceModelsById[m.parameterId];
			if( m.type === sourceModelInfo.intervalChangeEventName ){
				// Interval from a source model was changed
			} else if( m.type === sourceModelInfo.rangeChangeEventName ){
				// Range from a source model was changed
				sourceModelInfo.range = m.value;
				this._recomputeRange();
			};
		};
	},
	
	_getModelInfo: function(){
		var modelInfo = {
			modelId: this.modelId
			,modelType: 'timeSynchronize'
			,parameters: {}
		};
		
		// Add range parameter
		modelInfo.parameters.range = {
			parameterId: this.modelId + '_range'
			,type: 'dateInterval'
			,name: 'range'
			,label: _loc('Range')
			,setEvent: this.rangeSetEvent
			,getEvent: this.rangeGetEvent
			,changeEvent: this.rangeChangeEvent
			,value: this.currentRange
		};
		
		// Add interval parameter
		modelInfo.parameters.interval = {
			parameterId: this.modelId + '_interval'
			,type: 'dateInterval'
			,name: 'interval'
			,label: _loc('Interval')
			,setEvent: this.intervalSetEvent
			,getEvent: this.intervalGetEvent
			,changeEvent: this.intervalChangeEvent
			,value: this.getInterval()
		};
		
		return modelInfo;
	},

	_recomputeRange: function(){
		var newRange = undefined;
		var previousInterval = this.getInterval();
		
		for(var sourceModelId in this.sourceModelsById){
			var sourceModelInfo = this.sourceModelsById[sourceModelId];
			if( sourceModelInfo.range ){
				if( !newRange ){
					newRange = sourceModelInfo.range;
				} else {
					newRange.extendTo(sourceModelInfo.range, this.now);
				};
			};
		};
		
		var rangeChanged = false;
		if( this.currentRange && !newRange ){
			this.currentRange = newRange;
			rangeChanged = true;

		} else if( !this.currentRange && newRange ) {
			this.currentRange = newRange;
			rangeChanged = true;

		} else if( this.currentRange && newRange ){
			if( this.currentRange.equals(newRange) ){
				// Nothing to do
			} else {
				this.currentRange = newRange;
				rangeChanged = true;
			};

		} else {
			// !this.currentRange && !newRange: do nothing
		};
		
		if( rangeChanged ){
			this._contrainIntervalToRange();
			
			var currentInterval = this.getInterval();
			
			if( currentInterval === previousInterval ){
				// Nothing to do. Takes care of null === null
			} else if( currentInterval && currentInterval.equals(previousInterval) ){
				// Nothing to do
			} else {
				this._reportChangedInterval();
			};
			
			this._reportChangedRange();
		};
	},
	
	_reportChangedRange: function(){
		this.dispatchService.send(DH, {
			type: this.rangeChangeEvent
			,parameterId: this.modelId + '_range'
			,value: this.currentRange
		});
	},
	
	getInterval: function(){
		if( this.currentInterval ){
			return this.currentInterval;
		};
		
		return this.currentRange;
		
	},
	
	_contrainIntervalToRange: function(){
		if( this.currentInterval && this.currentRange ){
			// Interval should not fall outside range
			this.currentInterval = this.currentInterval.intersection(this.currentRange, this.now);
		} else if( !this.currentRange ) {
			// No range, then no interval
			this.currentInterval = null;
		};

		if( this.currentInterval && this.currentInterval.ongoing ){
			this.currentInterval.max = this.now;
		};
	},
	
	_setInterval: function(updatedInterval){
		var previous = this.getInterval();
		
		this.currentInterval = updatedInterval;

		this._contrainIntervalToRange();
		
		var current = this.getInterval();
		
		if( previous === current ) {
			// Nothing to do. This takes care of
			// previous and current being null
			
		} else if( previous && previous.equals(current) ){
			// Nothing to do
			
		} else {
			this._reportChangedInterval();
		};
	},
	
	_reportChangedInterval: function(){
		var current = this.getInterval();
		
		// Notify all source models
		for(var sourceModelId in this.sourceModelsById){
			var sourceModelInfo = this.sourceModelsById[sourceModelId];
			if( sourceModelInfo.intervalSetEventName ){
				this.dispatchService.send(DH, {
					type: sourceModelInfo.intervalSetEventName
					,parameterId: sourceModelInfo.parameterId
					,value: current
				});
			};
		};

		this.dispatchService.send(DH, {
			type: this.intervalChangeEvent
			,parameterId: this.modelId + '_interval'
			,value: current
		});
	}
});

//--------------------------------------------------------------------------
function handleModelCreate(m, addr, dispatcher){
	if( m.modelType === 'timeFilter' ){
		var options = {};
		
		if( m && m.modelOptions ){
			for(var key in m.modelOptions){
				var value = m.modelOptions[key];
				options[key] = value;
			};
		};
		
		options.modelId = m.modelId;
		options.modelType = m.modelType;
		
		if( m && m.config ){
			if( m.config.directory ){
				options.dispatchService = m.config.directory.dispatchService;
			};
		};
		
		m.model = new TimeFilter(options);
		
		m.created = true;
	    
	} else if( m.modelType === 'noTimeFilter' ){
		var options = {};
		
		if( m && m.modelOptions ){
			for(var key in m.modelOptions){
				var value = m.modelOptions[key];
				options[key] = value;
			};
		};
		
		options.modelId = m.modelId;
		options.modelType = m.modelType;
		
		if( m && m.config ){
			if( m.config.directory ){
				options.dispatchService = m.config.directory.dispatchService;
			};
		};
		
		m.model = new NoTimeFilter(options);
		
		m.created = true;
	    
	} else if( m.modelType === 'timeTransform' ){
		var options = {};
		
		if( m && m.modelOptions ){
			for(var key in m.modelOptions){
				var value = m.modelOptions[key];
				options[key] = value;
			};
		};
		
		options.modelId = m.modelId;
		options.modelType = m.modelType;
		
		if( m && m.config ){
			if( m.config.directory ){
				options.dispatchService = m.config.directory.dispatchService;
			};
		};
		
		m.model = new TimeTransform(options);
		
		m.created = true;
	    
	} else if( m.modelType === 'datedReferenceTransform' ){
		var options = {};
		
		if( m && m.modelOptions ){
			for(var key in m.modelOptions){
				var value = m.modelOptions[key];
				options[key] = value;
			};
		};
		
		options.modelId = m.modelId;
		options.modelType = m.modelType;
		
		if( m.config ){
			if( m.config.directory ){
				options.dispatchService = m.config.directory.dispatchService;
			};
		};
		
		m.model = new DatedReferenceTransform(options);
		
		m.created = true;
	    
	} else if( m.modelType === 'timeSynchronize' ){
		var options = {};
		
		if( m && m.modelOptions ){
			for(var key in m.modelOptions){
				var value = m.modelOptions[key];
				options[key] = value;
			};
		};
		
		options.modelId = m.modelId;
		options.modelType = m.modelType;
		
		if( m.config ){
			if( m.config.directory ){
				options.dispatchService = m.config.directory.dispatchService;
			};
		};
		
		m.model = new TimeSynchronize(options);
		
		m.created = true;
    };
};

//--------------------------------------------------------------------------
$n2.modelTime = {
	TimeFilter: TimeFilter
	,TimeTransform: TimeTransform
	,DatedReferenceTransform: DatedReferenceTransform
	,NoTimeFilter: NoTimeFilter
	,TimeSynchronize: TimeSynchronize
	,handleModelCreate: handleModelCreate
};

})(jQuery,nunaliit2);
