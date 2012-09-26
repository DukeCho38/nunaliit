package ca.carleton.gcrc.couch.app.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.Vector;

import org.json.JSONObject;
import ca.carleton.gcrc.couch.app.Attachment;
import ca.carleton.gcrc.couch.app.Document;
import ca.carleton.gcrc.couch.client.CouchDb;

public class DocumentCouchDb implements Document {

	static public DocumentCouchDb documentFromCouchDb(CouchDb couchDb, String docId) throws Exception {
		try {
			DocumentCouchDb doc = new DocumentCouchDb(couchDb, docId);
			return doc;
		} catch(Exception e) {
			throw new Exception("Unable to create document from database");
		}
	}
	
	private CouchDb couchDb;
	private JSONObject jsonObj;
	private List<AttachmentCouchDb> attachments = new Vector<AttachmentCouchDb>();
	
	public DocumentCouchDb(CouchDb couchDb, String docId) throws Exception {
		if( null == couchDb ){
			throw new Exception("A valid instance of CouchDb is required for document");
		}
		this.couchDb = couchDb;
		
		try {
			JSONObject jsonObj = this.couchDb.getDocument(docId);
			this.jsonObj = jsonObj;
		} catch(Exception e) {
			throw new Exception("Unable to access document from database ("+docId+")", e);
		}
		
		// Process attachments
		JSONObject _attachments = this.jsonObj.optJSONObject("_attachments");
		if( null != _attachments ){
			Iterator<?> it = _attachments.keys();
			while( it.hasNext() ){
				Object keyObj = it.next();
				if( keyObj instanceof String ){
					String attachmentName = (String)keyObj;
					JSONObject att = _attachments.getJSONObject(attachmentName);
					String contentType = att.getString("content_type");
					long size = att.getLong("length");
					
					AttachmentCouchDb attachment = new AttachmentCouchDb(
							couchDb
							,docId
							,attachmentName
							,contentType
							,size
							);
					attachments.add(attachment);
				}
			}
		}
	}
	
	@Override
	public String getId() {
		if( null != jsonObj ) {
			String id = jsonObj.optString("_id");
			return id;
		}
		return null;
	}

	@Override
	public void setId(String id) throws Exception {
		jsonObj.put("_id", id);
	}

	@Override
	public String getRevision() {
		if( null != jsonObj ) {
			String id = jsonObj.optString("_rev");
			return id;
		}
		return null;
	}

	@Override
	public JSONObject getJSONObject() {
		return jsonObj;
	}

	@Override
	public Collection<Attachment> getAttachments() {
		return new ArrayList<Attachment>(attachments);
	}

}
