/* Copyright (c) 2006-2008 MetaCarta, Inc., published under the Clear BSD
 * license.  See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */

;(function($n2){
"use strict";


if( typeof OpenLayers !== 'undefined'
 && OpenLayers.Control
 && OpenLayers.Class
 ) {
	// =================== NunaliitGazetteer ==========================
	OpenLayers.Control.NunaliitGazetteer = OpenLayers.Class(OpenLayers.Control, {

		activateListener: null,
		
	    /**
	     * Constructor: OpenLayers.Control.Navigation
	     * Create a new navigation control
	     * 
	     * Parameters:
	     * options - {Object} An optional object whose properties will be set on
	     *                    the control
	     */
	    initialize: function(options) {
	        this.handlers = {};
	        OpenLayers.Control.prototype.initialize.apply(this, arguments);
	    },
	
	    /**
	     * Method: destroy
	     * The destroy method is used to perform any clean up before the control
	     * is dereferenced.  Typically this is where event listeners are removed
	     * to prevent memory leaks.
	     */
	    destroy: function() {
	        this.deactivate();
	
	        OpenLayers.Control.prototype.destroy.apply(this,arguments);
	    },
	    
	    /**
	     * Method: activate
	     */
	    activate: function() {
	    	if( typeof(this.activateListener) === 'function' ){
	    		this.activateListener();
	    	} else {
		        return OpenLayers.Control.prototype.activate.apply(this,arguments);
	    	};
	    },
	
	    /**
	     * Method: deactivate
	     */
	    deactivate: function() {
	        return OpenLayers.Control.prototype.deactivate.apply(this,arguments);
	    },
	    
	    CLASS_NAME: "OpenLayers.Control.NunaliitGazetteer"
	});

}; // If OpenLayers is defined

})(nunaliit2);
