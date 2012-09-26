package ca.carleton.gcrc.couch.onUpload.conversion;

import org.json.JSONObject;
import ca.carleton.gcrc.couch.utils.CouchNunaliitConstants;

public class CreateUpdateInfo extends AbstractDescriptor {

	private FileConversionContext context;
	private String key;
	
	public CreateUpdateInfo(FileConversionContext context, String key){
		this.context = context;
		this.key = key;
	}
	
	public long getTime() throws Exception {
		return getLongAttribute(CouchNunaliitConstants.CREATE_UPDATE_KEY_TIME);
	}
	
	public String getUserName() throws Exception {
		return getStringAttribute(CouchNunaliitConstants.CREATE_UPDATE_KEY_NAME);
	}
	
	@Override
	protected JSONObject getJson() throws Exception {
		JSONObject doc = context.getDoc();
		
		return doc.getJSONObject(key);
	}

	@Override
	protected void setSavingRequired(boolean flag) {
		context.setSavingRequired(flag);
	}
}
