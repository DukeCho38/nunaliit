package ca.carleton.gcrc.couch.command;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Stack;
import java.util.Vector;

public class Options {
	
	static final public String OPTION_ATLAS_DIR = "--atlas-dir";
	static final public String OPTION_DEF = "--def";
	static final public String OPTION_GROUP = "--group";
	static final public String OPTION_ID = "--id";
	static final public String OPTION_DUMP_DIR = "--dump-dir";
	static final public String OPTION_DOC_ID = "--doc-id";
	static final public String OPTION_NAME = "--name";

	static final public String OPTION_DEBUG = "--debug";
	static final public String OPTION_NO_CONFIG = "--no-config";
	static final public String OPTION_SKELETON = "--skeleton";
	static final public String OPTION_OVERWRITE_DOCS = "--overwrite-docs";
	static final public String OPTION_ALL = "--all";
	static final public String OPTION_TEST = "--test";

	private List<String> arguments;
	private Boolean debug;
	private Boolean noConfig;
	private Boolean skeleton;
	private Boolean overwriteDocs;
	private Boolean all;
	private Boolean test;
	private String atlasDir;
	private String def;
	private String group;
	private String id;
	private String dumpDir;
	private List<String> docIds = new Vector<String>();
	private String name;
	
	public Options() {
		arguments = new Vector<String>();
	}
	
	public void parseOptions(List<String> args) throws Exception {
		Stack<String> argumentStack = new Stack<String>();
		for(int i=args.size()-1; i>=0; --i){
			argumentStack.push( args.get(i) );
		}

		while( false == argumentStack.empty() ){
			String arg = argumentStack.pop();
			
			if( arg.startsWith("--") ){
				// this is an option
				if( OPTION_DEBUG.equals(arg) ){
					debug = Boolean.TRUE;

				} else if( OPTION_NO_CONFIG.equals(arg) ){
					noConfig = Boolean.TRUE;

				} else if( OPTION_SKELETON.equals(arg) ){
					skeleton = Boolean.TRUE;

				} else if( OPTION_OVERWRITE_DOCS.equals(arg) ){
					overwriteDocs = Boolean.TRUE;

				} else if( OPTION_ALL.equals(arg) ){
					all = Boolean.TRUE;

				} else if( OPTION_TEST.equals(arg) ){
					test = Boolean.TRUE;

				} else if( OPTION_ATLAS_DIR.equals(arg) ){
					if( argumentStack.size() < 1 ){
						throw new Exception(OPTION_ATLAS_DIR+" option requires the directory where the atlas is located");
					}
					
					if( null != atlasDir ){
						throw new Exception("Option "+OPTION_ATLAS_DIR+" can be specified only once");
					}

					atlasDir = argumentStack.pop();

				} else if( OPTION_DEF.equals(arg) ){
					if( argumentStack.size() < 1 ){
						throw new Exception(OPTION_DEF+" option requires the location of a definition file");
					}
					
					if( null != def ){
						throw new Exception("Option "+OPTION_DEF+" can be specified only once");
					}

					def = argumentStack.pop();

				} else if( OPTION_GROUP.equals(arg) ){
					if( argumentStack.size() < 1 ){
						throw new Exception(OPTION_GROUP+" option requires the location of a group name");
					}
					
					if( null != group ){
						throw new Exception("Option "+OPTION_GROUP+" can be specified only once");
					}

					group = argumentStack.pop();

				} else if( OPTION_ID.equals(arg) ){
					if( argumentStack.size() < 1 ){
						throw new Exception(OPTION_ID+" option requires a container identifier");
					}
					
					if( null != id ){
						throw new Exception("Option "+OPTION_ID+" can be specified only once");
					}

					id = argumentStack.pop();

				} else if( OPTION_DUMP_DIR.equals(arg) ){
					if( argumentStack.size() < 1 ){
						throw new Exception(OPTION_DUMP_DIR+" option requires the location of the dump directory");
					}
					
					if( null != dumpDir ){
						throw new Exception("Option "+OPTION_DUMP_DIR+" can be specified only once");
					}

					dumpDir = argumentStack.pop();

				} else if( OPTION_DOC_ID.equals(arg) ){
					if( argumentStack.size() < 1 ){
						throw new Exception(OPTION_DOC_ID+" option requires a document identifier");
					}
					
					String docId = argumentStack.pop();
					docIds.add(docId);

				} else if( OPTION_NAME.equals(arg) ){
					if( argumentStack.size() < 1 ){
						throw new Exception(OPTION_NAME+" option requires the name of a schema");
					}
					
					if( null != name ){
						throw new Exception("Option "+OPTION_NAME+" can be specified only once");
					}

					name = argumentStack.pop();

				} else {
					throw new Exception("Unrecognized option: "+arg);
				}

			} else {
				arguments.add(arg);
			}
		}
	}
	
	public void validateExpectedOptions(String[] expectedOptions) throws Exception {
		Set<String> expected = new HashSet<String>();
		for(String expectedOption : expectedOptions){
			expected.add(expectedOption);
		}
		
		// Debug is always OK
//		if( null != debug && false == expected.contains(OPTION_DEBUG)){
//			throw new Exception("Unexpected option: "+OPTION_DEBUG);
//		}

		if( null != noConfig && false == expected.contains(OPTION_NO_CONFIG)){
			throw new Exception("Unexpected option: "+OPTION_NO_CONFIG);
		}
		if( null != skeleton && false == expected.contains(OPTION_SKELETON)){
			throw new Exception("Unexpected option: "+OPTION_SKELETON);
		}
		if( null != overwriteDocs && false == expected.contains(OPTION_OVERWRITE_DOCS)){
			throw new Exception("Unexpected option: "+OPTION_OVERWRITE_DOCS);
		}
		if( null != all && false == expected.contains(OPTION_ALL)){
			throw new Exception("Unexpected option: "+OPTION_ALL);
		}
		if( null != test && false == expected.contains(OPTION_TEST)){
			throw new Exception("Unexpected option: "+OPTION_TEST);
		}
		if( null != atlasDir && false == expected.contains(OPTION_ATLAS_DIR)){
			throw new Exception("Unexpected option: "+OPTION_ATLAS_DIR);
		}
		if( null != def && false == expected.contains(OPTION_DEF)){
			throw new Exception("Unexpected option: "+OPTION_DEF);
		}
		if( null != group && false == expected.contains(OPTION_GROUP)){
			throw new Exception("Unexpected option: "+OPTION_GROUP);
		}
		if( null != id && false == expected.contains(OPTION_ID)){
			throw new Exception("Unexpected option: "+OPTION_ID);
		}
		if( null != dumpDir && false == expected.contains(OPTION_DUMP_DIR)){
			throw new Exception("Unexpected option: "+OPTION_DUMP_DIR);
		}
		if( docIds.size() > 0 && false == expected.contains(OPTION_DOC_ID)){
			throw new Exception("Unexpected option: "+OPTION_DOC_ID);
		}
		if( null != name && false == expected.contains(OPTION_NAME)){
			throw new Exception("Unexpected option: "+OPTION_NAME);
		}
	}

	public List<String> getArguments() {
		return arguments;
	}

	public Boolean getDebug() {
		return debug;
	}

	public Boolean getNoConfig() {
		return noConfig;
	}

	public Boolean getSkeleton() {
		return skeleton;
	}

	public Boolean getOverwriteDocs() {
		return overwriteDocs;
	}

	public Boolean getAll() {
		return all;
	}

	public Boolean getTest() {
		return test;
	}

	public String getAtlasDir() {
		return atlasDir;
	}

	public String getDef() {
		return def;
	}

	public String getGroup() {
		return group;
	}

	public String getId() {
		return id;
	}

	public String getDumpDir() {
		return dumpDir;
	}

	public List<String> getDocIds() {
		return docIds;
	}

	public String getName() {
		return name;
	}
}
