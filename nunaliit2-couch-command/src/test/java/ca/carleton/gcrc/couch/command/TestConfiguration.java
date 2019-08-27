package ca.carleton.gcrc.couch.command;

import java.io.PrintWriter;
import java.io.Reader;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.Writer;

public class TestConfiguration {

	final static public String ATLAS_NAME = "atlas";
	final static public String COUCHDB_URL_STR = "http://127.0.0.1:5984/";
	final static public String COUCHDB_DB_NAME = "dbname";
	final static public boolean COUCHDB_SUBMISSION_ENABLED = false;
	final static public String COUCHDB_SUBMISSION_DB_NAME = "dbnamesubmissions";
	final static public String COUCHDB_DB_ADMIN_USER = "admin";
	final static public String COUCHDB_DB_ADMIN_PW = "adminpw";
	final static public int    SERVLET_URL_PORT = 8099;
	final static public String GOOGLE_MAPAPI_KEY = "abcdef";

	private String atlasName = ATLAS_NAME;
	private String couchDbUrlStr = COUCHDB_URL_STR;
	private String couchDbName = COUCHDB_DB_NAME;
	private boolean couchDbSubmissionEnabled = COUCHDB_SUBMISSION_ENABLED;
	private String couchDbSubmissionDbName = COUCHDB_SUBMISSION_DB_NAME;
	private String couchDbAdminUser = COUCHDB_DB_ADMIN_USER;
	private String couchDbAdminPassword = COUCHDB_DB_ADMIN_PW;
	private int servletUrlPort = SERVLET_URL_PORT;
	private String googleMapApiKey = GOOGLE_MAPAPI_KEY;
	
	public String getAtlasName() {
		return atlasName;
	}
	public void setAtlasName(String atlasName) {
		this.atlasName = atlasName;
	}

	public String getCouchDbUrlStr() {
		return couchDbUrlStr;
	}
	public void setCouchDbUrlStr(String couchDbUrlStr) {
		this.couchDbUrlStr = couchDbUrlStr;
	}

	public String getCouchDbName() {
		return couchDbName;
	}
	public void setCouchDbName(String couchDbName) {
		this.couchDbName = couchDbName;
	}

	public boolean isCouchDbSubmissionEnabled() {
		return couchDbSubmissionEnabled;
	}
	public void setCouchDbSubmissionEnabled(boolean couchDbSubmissionEnabled) {
		this.couchDbSubmissionEnabled = couchDbSubmissionEnabled;
	}

	public String getCouchDbSubmissionDbName() {
		return couchDbSubmissionDbName;
	}
	public void setCouchDbSubmissionDbName(String couchDbSubmissionDbName) {
		this.couchDbSubmissionDbName = couchDbSubmissionDbName;
	}

	public String getCouchDbAdminUser() {
		return couchDbAdminUser;
	}
	public void setCouchDbAdminUser(String couchDbAdminUser) {
		this.couchDbAdminUser = couchDbAdminUser;
	}

	public String getCouchDbAdminPassword() {
		return couchDbAdminPassword;
	}
	public void setCouchDbAdminPassword(String couchDbAdminPassword) {
		this.couchDbAdminPassword = couchDbAdminPassword;
	}

	public int getServletUrlPort() {
		return servletUrlPort;
	}
	public void setServletUrlPort(int servletUrlPort) {
		this.servletUrlPort = servletUrlPort;
	}

	public String getGoogleMapApiKey() {
		return googleMapApiKey;
	}
	public void setGoogleMapApiKey(String googleMapApiKey) {
		this.googleMapApiKey = googleMapApiKey;
	}

	public void printUserInputs(Writer writer){
		PrintWriter pw = new PrintWriter(writer);
		pw.println(atlasName);
		pw.println(couchDbUrlStr);
		pw.println(couchDbName);
		if( couchDbSubmissionEnabled ){
			pw.println('y');
			pw.println(couchDbSubmissionDbName);
		} else {
			pw.println('n');
		}
		pw.println(couchDbAdminUser);
		pw.println(couchDbAdminPassword);
		pw.println(servletUrlPort);
		pw.println(googleMapApiKey);
		pw.flush();
	}
	
	public Reader getUserInputReader(){
		StringWriter sw = new StringWriter();
		printUserInputs(sw);
		StringReader sr = new StringReader(sw.toString());
		return sr;
	}
}
