/** @babel */
import postcss from 'postcss';
import perfectionist from 'perfectionist';
import postcssSafeParser from 'postcss-safe-parser';

function init() {
	const editor = atom.workspace.getActiveTextEditor();

	if (!editor) {
		return;
	}

	const selectedText = editor.getSelectedText();
	const text = selectedText || editor.getText();

	postcss(perfectionist(atom.config.get('perfectionist'))).process(text, {
		parser: postcssSafeParser
	}).then(result => {
		result.warnings().forEach(x => {
			console.warn(x.toString());
			atom.notifications.addWarning('Perfectionist', {detail: x.toString()});
		});

		const cursorPosition = editor.getCursorBufferPosition();

		if (selectedText) {
			editor.setTextInBufferRange(editor.getSelectedBufferRange(), result.css);
		} else {
			editor.setText(result.css);
		}

		editor.setCursorBufferPosition(cursorPosition);
	}).catch(err => {
		if (err.name === 'CssSyntaxError') {
			err.message += err.showSourceCode();
		}

		console.error(err);
		atom.notifications.addError('Perfectionist', {detail: err.message});
	});
}

export const config = {
	cascade: {
		description: 'Visual cascading of vendor prefixed properties. Note that this transform only applies to the `expanded` format.',
		type: 'boolean',
		default: true
	},
	format: {
		description: 'Note that the `compressed` format only facilitates simple whitespace compression around selectors & declarations. For more powerful compression, see [cssnano](https://github.com/ben-eb/cssnano).',
		type: 'string',
		default: 'expanded',
		enum: [
			'expanded',
			'compact',
			'compressed'
		]
	},
	indentSize: {
		type: 'number',
		default: 4
	},
	maxAtRuleLength: {
		description: 'If set to a positive integer, set a maximum width for at-rule parameters; if they exceed this, they will be split up over multiple lines. If false, this behaviour will not be performed. Note that this transform only applies to the `expanded` format.',
		type: [
			'boolean',
			'number'
		],
		default: 80
	},
	maxSelectorLength: {
		description: 'If set to a positive integer, set a maximum width for a selector string; if it exceeds this, it will be split up over multiple lines. If false, this behaviour will not be performed. Note that this transform is excluded from the `compressed` format.',
		type: [
			'boolean',
			'number'
		],
		default: 80
	},
	maxValueLength: {
		description: 'If set to a positive integer, set a maximum width for a property value; if it exceeds this, it will be split up over multiple lines. If false, this behaviour will not be performed. Note that this transform only applies to the `expanded` format.',
		type: [
			'boolean',
			'number'
		],
		default: 80
	}
};

export const activate = () => {
	atom.commands.add('atom-workspace', 'perfectionist:beautify-css', init);
};
