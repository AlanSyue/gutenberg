/** @format */
const blacklist = require( 'metro' ).createBlacklist;
const enm = require( './extra-node-modules.config.js' );

module.exports = {
	extraNodeModules: enm,
	getBlacklistRE: function() {
		// There's a nested checkout of the mobile code inside the Gutenberg repo
		//  as a submodule. Blacklist it to avoid errors due to duplicate modules.
		return blacklist( [ /gutenberg\/gutenberg-mobile\/.*/ ] );
	},
	getTransformModulePath() {
		return require.resolve( './sass-transformer.js' );
	},
	getSourceExts() {
		return [ 'js', 'json', 'scss', 'sass' ];
	},
};
