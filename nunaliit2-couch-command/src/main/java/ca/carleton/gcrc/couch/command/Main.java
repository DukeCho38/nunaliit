package ca.carleton.gcrc.couch.command;

import java.io.File;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Stack;
import java.util.Vector;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.apache.log4j.PatternLayout;
import org.apache.log4j.PropertyConfigurator;
import org.apache.log4j.WriterAppender;
import org.slf4j.LoggerFactory;

import ca.carleton.gcrc.couch.command.impl.PathComputer;

public class Main {
	
	final static private org.slf4j.Logger logger = LoggerFactory.getLogger(Main.class.getClass());
	
	static private List<Command> allCommands = null;
	synchronized static public List<Command> getCommands(){
		if( null == allCommands ) {
			allCommands = new Vector<Command>();
			
			allCommands.add( new CommandHelp() );
			allCommands.add( new CommandCreate() );
			allCommands.add( new CommandConfig() );
			allCommands.add( new CommandUpdate() );
			allCommands.add( new CommandUpdateUser() );
			allCommands.add( new CommandRun() );
			allCommands.add( new CommandDump() );
			allCommands.add( new CommandRestore() );
			allCommands.add( new CommandUpgrade() );
			allCommands.add( new CommandVersion() );
		}
		
		return allCommands;
	}

	static public void main(String[] args) {
		GlobalSettings globalSettings = null;
		
		try {
			List<String> arguments = new ArrayList<String>(args.length);
			for(String arg : args){
				arguments.add(arg);
			}
			
			globalSettings = new GlobalSettings();
			
			Main app = new Main();
			app.execute(globalSettings, arguments);
			System.exit(0);
			
		} catch(Exception e) {

			logger.error("Error: "+e.getMessage(),e);
			
			PrintStream err = System.err;
			if( null != globalSettings ) {
				err = globalSettings.getErrStream();
			} 
			
			if( null != globalSettings 
			 && globalSettings.isDebug() ){
				e.printStackTrace(err);
				
			} else {
				err.print("Error: "+e.getMessage());
				err.println();
				
				int limit = 10;
				Throwable cause = e.getCause();
				while(null != cause && limit > 0) {
					err.print("Caused by: "+cause.getMessage());
					err.println();
					cause = cause.getCause();
					--limit;
				}
			}
			
			// Error
			System.exit(1);
		}
	}
	
	public void execute(GlobalSettings globalSettings, List<String> args) throws Exception {
		
		// Turn arguments into a stack
		Stack<String> argumentStack = new Stack<String>();
		for(int i=args.size()-1; i>=0; --i){
			argumentStack.push( args.get(i) );
		}
		
		// Process global options
		processGlobalOptions(globalSettings, argumentStack);

		// Default log4j configuration
		{
			Logger rootLogger = Logger.getRootLogger();
			rootLogger.setLevel(Level.ERROR);
			rootLogger.addAppender(new WriterAppender(new PatternLayout("%d{ISO8601}[%-5p]: %m%n"),globalSettings.getErrStream()));
		}
		
		// Compute needed file paths
		{
			File installDir = PathComputer.computeInstallDir();
			
			globalSettings.setInstallDir( installDir );
		}
		
		// Find out command
		if( argumentStack.empty() ){
			throw new Exception("No command provided. Try 'help'.");
		}
		String commandKeyword = argumentStack.pop();
		for(Command command : getCommands()){
			if( command.matchesKeyword(commandKeyword) ) {
				// Found the command in question
				performCommand(
					command
					,globalSettings
					,argumentStack
				);
				return;
			}
		}
		
		// At this point the command was not found
		throw new Exception("Can not understand command: "+commandKeyword);
	}

	private void processGlobalOptions(
		GlobalSettings globalSettings
		,Stack<String> argumentStack
		) throws Exception {

		// Pick up options
		while( false == argumentStack.empty() ){
			String optionName = argumentStack.peek();
			if( "--atlas-dir".equals(optionName) ){
				argumentStack.pop();
				
				if( argumentStack.empty() ){
					throw new Exception("Directory expected for global option '--atlas-dir'");
				}
				String atlasDirStr = argumentStack.pop();
				File atlasDir = PathComputer.computeAtlasDir(atlasDirStr);
				globalSettings.setAtlasDir(atlasDir);
				
			} else if( "--debug".equals(optionName) ){
					argumentStack.pop();
					globalSettings.setDebug(true);
					
			} else {
				break;
			}
		}
		
	}

	private void performCommand(Command command, GlobalSettings gs, Stack<String> argumentStack) throws Exception {
		if( command.requiresAtlasDir() ){
			if( null == gs.getAtlasDir() ) {
				// Use current directory
				gs.setAtlasDir( PathComputer.computeAtlasDir(null) );
			}
			
			// Verify that this is valid a nunaliit directory

			// Check that atlas directory exists
			File atlasDir = gs.getAtlasDir();
			if( false == atlasDir.exists() ){
				throw new Exception("Atlas directory not found: "+atlasDir.getAbsolutePath());
			}
			if( false == atlasDir.isDirectory() ){
				throw new Exception("Atlas is not a directory: "+atlasDir.getAbsolutePath());
			}

			// Check nunaliit.properties file
			{
				File propFile = new File(atlasDir,"config/nunaliit.properties");
				if( false == propFile.exists() 
				 || false == propFile.isFile() ) {
					throw new Exception("Directory does not appear to contain an atlas: "+atlasDir.getAbsolutePath());
				}
			}
		}
		
		// Configure log4j
		{
			// Try to load config/log4j.properties
			File atlasDir = gs.getAtlasDir();
			File log4jConfFile = new File(atlasDir, "config/log4j.properties");
			if( log4jConfFile.exists() 
			 && log4jConfFile.isFile() ) {
				PropertyConfigurator.configure(log4jConfFile.getAbsolutePath());
			}
		}
		
		command.runCommand(gs ,argumentStack);
	}
}
