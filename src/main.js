// noinspection NpmUsedModulesInstalled
import { Events, Styler, UICorePlugin, template } from 'clappr'
import pluginHtml from './public/audio-track-selector.html'
import pluginStyle from './public/style.scss'

const AUTO = -1;

export default class AudioTrackSelector extends UICorePlugin {

	static get version() {
		// noinspection JSUnresolvedVariable
		return VERSION;
	}

	// noinspection JSMethodCanBeStatic
	get name() {
		return 'audio_track_selector'
	}

	// noinspection JSMethodCanBeStatic
	get template() {
		return template(pluginHtml)
	}

	get attributes() {
		return {
			'class'                    : this.name,
			'data-audio-track-selector': ''
		}
	}

	get events() {
		this.debug('events');
		return {
			'click [data-audio-track-selector-select]': 'onLevelSelect',
			'click [data-audio-track-selector-button]': 'onShowLevelSelectMenu'
		}
	}

	debug(message) {
		// noinspection ES6ModulesDependencies
		Clappr.Log.info(this.name, message);
	}

	warn(message) {
		// noinspection ES6ModulesDependencies
		Clappr.Log.warn(this.name, message);
	}

	bindEvents() {
		this.debug('bindEvents');
		this.listenTo(this.core, Events.CORE_READY, this.bindPlaybackEvents);
		this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_CONTAINERCHANGED, this.reload);
		this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_RENDERED, this.render);
		this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_HIDE, this.hideSelectLevelMenu);
	}

	unBindEvents() {
		this.debug('unBindEvents');
		// noinspection JSCheckFunctionSignatures
		this.stopListening(this.core, Events.CORE_READY);
		// noinspection JSCheckFunctionSignatures
		this.stopListening(this.core.mediaControl, Events.MEDIACONTROL_CONTAINERCHANGED);
		// noinspection JSCheckFunctionSignatures
		this.stopListening(this.core.mediaControl, Events.MEDIACONTROL_RENDERED);
		// noinspection JSCheckFunctionSignatures
		this.stopListening(this.core.mediaControl, Events.MEDIACONTROL_HIDE);
		// noinspection JSCheckFunctionSignatures
		this.stopListening(this.core.getCurrentPlayback(), Events.PLAYBACK_LEVELS_AVAILABLE);
		// noinspection JSCheckFunctionSignatures
		this.stopListening(this.core.getCurrentPlayback(), Events.PLAYBACK_LEVEL_SWITCH_START);
		// noinspection JSCheckFunctionSignatures
		this.stopListening(this.core.getCurrentPlayback(), Events.PLAYBACK_LEVEL_SWITCH_END);
		// noinspection JSCheckFunctionSignatures
		this.stopListening(this.core.getCurrentPlayback(), Events.PLAYBACK_BITRATE);
	}

	bindPlaybackEvents() {
		this.debug('bindPlaybackEvents');
		let currentPlayback = this.core.getCurrentPlayback();

		this.listenTo(currentPlayback, Events.PLAYBACK_LOADEDMETADATA, this.fillLevels);
		//this.listenTo(currentPlayback, Events.PLAYBACK_LEVEL_SWITCH_START, this.startLevelSwitch)
		//this.listenTo(currentPlayback, Events.PLAYBACK_LEVEL_SWITCH_END, this.stopLevelSwitch)
		this.listenTo(currentPlayback, Events.PLAYBACK_BITRATE, this.updateCurrentLevelVideo);

		this.debug('bindPlaybackEvents' + currentPlayback);
		let playbackLevelsAvaialbeWasTriggered = currentPlayback.levels && currentPlayback.levels.length > 0;
		playbackLevelsAvaialbeWasTriggered && this.fillLevels(currentPlayback.levels)
	}

	reload() {
		this.debug('reload');
		this.unBindEvents();
		this.bindEvents();
		this.bindPlaybackEvents();
	}

	shouldRender() {
		this.debug('shouldRender');
		if(!this.core.getCurrentContainer()) return false;

		let currentPlayback = this.core.getCurrentPlayback();
		if(!currentPlayback) return false;

		let respondsToCurrentLevel = currentPlayback.currentLevel !== undefined;
		// Only care if we have at least 2 to choose from
		let hasLevels = !!(this.audiotrack && this.audiotrack.length > 1);

		this.debug('shouldRender (' + respondsToCurrentLevel + ')(' + hasLevels + ')');

		return respondsToCurrentLevel && hasLevels
	}

	render() {
		this.debug('render');
		if(this.shouldRender()) {
			let style = Styler.getStyleFor(pluginStyle, {baseUrl: this.core.options.baseUrl});

			// noinspection JSValidateTypes
			this.$el.html(this.template({'levels': this.audiotrack, 'title': this.getTitle()}));
			this.$el.append(style);
			this.core.mediaControl.$('.media-control-right-panel').append(this.el);
			this.highlightCurrentLevel();
		}
		return this
	}

	fillLevels(levels, initialLevel = AUTO) {
		this.debug('fillLevels');
		this.debug(levels);

		if(this.core.getCurrentPlayback()._hls.audioTracks === undefined) {
			this.warn('this.core.getCurrentPlayback()._hls.audioTracks === undefined');
			return;
		}

		if(this.core.getCurrentPlayback()._hls.audioTracks.length === 0) {
			this.warn('this.core.getCurrentPlayback()._hls.audioTracks.length === 0');
			return;
		}

		this.debug('start filling in audio tracks');

		if(this.selectedLevelId === undefined) this.selectedLevelId = initialLevel;

		//this.audiotrack = levels
		this.audiotrack = this.core.getCurrentPlayback()._hls.audioTracks;
		this.debug(this.audiotrack);
		for (let x = 0; x < this.audiotrack.length; x++) {
			this.audiotrack[x].id = x;
		}

		for (let x = 0; x < this.audiotrack.length; x++) {
			this.debug(x);

			// noinspection EqualityComparisonWithCoercionJS
			if(this.audiotrack[x].groupId == this.core.getCurrentPlayback()._hls.streamController.levels[+this.core.getCurrentPlayback()._hls.streamController.level].attrs.AUDIO) {
				this.debug('a group match, selecting default(' + this.audiotrack[x].groupId + ')(' + this.core.getCurrentPlayback()._hls.streamController.levels[+this.core.getCurrentPlayback()._hls.streamController.level].attrs.AUDIO + ')');
				if(this.audiotrack[x].default === true) {
					this.debug('selecting');
					this.debug(this.audiotrack[x]);
					this.selectedLevelId = x;

					this.currentLevel = this.audiotrack[this.selectedLevelId];
					this.core.getCurrentPlayback()._hls.audioTrack = this.selectedLevelId;
					this.highlightCurrentLevel();
				}
			}
		}

		this.configureLevelsLabels();
		//
		this.render();

		let group = this.core.getCurrentPlayback()._hls.streamController.levels[this.core.getCurrentPlayback()._hls.streamController.level].attrs.AUDIO;
		this.agroupElement().addClass('hidden');
		this.$('.audio_track_selector ul a[data-level-group-selector-select="' + group + '"]').parent().removeClass('hidden')

	}

	configureLevelsLabels() {
		this.debug('configureLevelsLabels');
		// noinspection JSUnresolvedVariable
		if(this.core.options.AudioTrackSelectorConfig === undefined) return;

		// noinspection JSUnresolvedVariable
		const labels = (this.core.options.AudioTrackSelectorConfig.labels || {});
		for (let levelId in labels) {
			if(!labels.hasOwnProperty(levelId))
				continue;

			this.debug('configureLevelsLabels levelId:' + levelId);
			levelId = parseInt(levelId, 10);
			let thereIsLevel = !!this.findLevelBy(levelId);
			thereIsLevel && this.changeLevelLabelBy(levelId, labels[levelId])
		}
	}

	findLevelBy(id) {
		this.debug('findLevelBy');
		this.debug(id);
		this.debug(this.audiotrack);
		let foundLevel = null;
		this.audiotrack.forEach((level) => {
			if(level.id === id) {
				foundLevel = level
			}
		});
		return foundLevel;
	}

	changeLevelLabelBy(id, newLabel) {
		this.debug('changeLevelLabelBy');
		this.audiotrack.forEach((level, index) => {
			if(level.id === id) {
				this.audiotrack[index].name = newLabel
			}
		})
	}

	onLevelSelect(event) {
		this.debug('onLevelSelect (' + event.target.dataset.audioTrackSelectorSelect + ')');
		this.debug('||' + event.target.dataset.audioTrackSelectorSelect.substr(6) + '||');

//     this.selectedLevelId = parseInt(event.target.dataset.audioTrackSelectorSelect.substr(6), 10)
		this.selectedLevelId = event.target.dataset.audioTrackSelectorSelect.substr(6);
		this.debug('' + this.currentLevel.id + ' == ' + this.selectedLevelId + '');
		if(this.currentLevel.id === this.selectedLevelId) return false;
		this.currentLevel = this.audiotrack[this.selectedLevelId];
		this.debug(this.audiotrack[this.selectedLevelId]);
		this.debug(this.core.getCurrentPlayback()._hls);
		this.debug(this.core.getCurrentPlayback()._hls.audioTracks);

		//this.core.getCurrentPlayback()._hls.audioTrack= this.audiotrack[this.selectedLevelId];
		this.core.getCurrentPlayback()._hls.audioTrack = this.selectedLevelId;

		this.toggleContextMenu();
		this.highlightCurrentLevel();
		event.stopPropagation();

		return false
	}

	onShowLevelSelectMenu() {
		this.toggleContextMenu();
	}

	hideSelectLevelMenu() {
		this.$('.audio_track_selector ul').hide();
	}

	toggleContextMenu() {
		this.$('.audio_track_selector ul').toggle();
	}

	buttonElement() {
		return this.$('.audio_track_selector button');
	}

	levelElement(id) {
		return this.$('.audio_track_selector ul a' + (!isNaN(id) ? '[data-audio-track-selector-select="audio_' + id + '"]' : '')).parent();
	}

	agroupElement(gid) {
		return this.$('.audio_track_selector ul a' + (!isNaN(gid) ? '[data-level-group-selector-select="' + gid + '"]' : '')).parent();
	}

	getTitle() {
		// noinspection JSUnresolvedVariable
		return (this.core.options.AudioTrackSelectorConfig || {}).name;
	}

	startLevelSwitch() {
		this.buttonElement().addClass('changing');
	}

	stopLevelSwitch() {
		this.buttonElement().removeClass('changing');
	}

	updateText(level) {
		this.debug('updateText (' + level + ')');
		if(level === -1) {
			this.buttonElement().text(this.findLevelBy(this.audiotrack[0].id).name);
			this.selectedLevelId = this.audiotrack[0].id;
		}
		else {
			this.buttonElement().text(this.findLevelBy(this.audiotrack[level].id).name)
		}
	}

	updateCurrentLevel(info) {
		this.debug('updateCurrentLevel');
		this.debug(info);
		let level = this.findLevelBy(info.id);
		this.debug(level);
		this.currentLevel = level ? level : null;
		this.highlightCurrentLevel()
	}

	updateCurrentLevelVideo(info) {
		this.debug('updateCurrentLevelVideo');

		if(this.audiotrack === undefined) return;
		if(this.audiotrack.length === 0) return;

		this.debug('updateCurrentLevelVideo2');

		let group = this.core.getCurrentPlayback()._hls.streamController.levels[info.level].attrs.AUDIO;
		this.agroupElement().addClass('hidden');
		this.$('.audio_track_selector ul a[data-level-group-selector-select="' + group + '"]').parent().removeClass('hidden');

		for (let x = 0; x < this.audiotrack.length; x++) {
			if(this.audiotrack[x].groupId === this.core.getCurrentPlayback()._hls.streamController.levels[info.level].attrs.AUDIO) {
				//this.agroupElement(this.audiotrack[x].groupId).removeClass('hidden')
				this.debug('a group match, selecting default('+this.audiotrack[x].groupId +')('+this.core.getCurrentPlayback()._hls.streamController.levels[info.level].attrs.AUDIO+')');
				if(this.audiotrack[x].default === true) {
					this.debug('selecting');
					this.debug(this.audiotrack[x]);
					this.selectedLevelId = x;

					if(this.currentLevel.id === this.selectedLevelId) return false;

					this.currentLevel = this.audiotrack[this.selectedLevelId];
					this.core.getCurrentPlayback()._hls.audioTrack = this.selectedLevelId;
					this.highlightCurrentLevel();
				}
			}
		}
		//
		//
	}

	highlightCurrentLevel() {
		this.debug('highlightCurrentLevel (' + this.currentLevel.id + ')');
		this.debug(this.currentLevel);
		this.levelElement().removeClass('current');
		this.levelElement(this.currentLevel.id).addClass('current');
		this.updateText(this.selectedLevelId)
	}
}
