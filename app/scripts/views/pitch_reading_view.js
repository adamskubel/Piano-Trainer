import React, {Component} from "react";
import classNames from "classnames";
import _ from "lodash";

import PitchStatisticView from "../views/pitch_statistic_view.js";
import PitchSettingsView from "../views/pitch_settings_view.js";
import AnalyticsService from "../services/analytics_service.js";
import MidiService from "../services/midi_service.js";
import BarGenerator from "../services/bar_generator.js";
import LevelService from "../services/level_service.js";
import StaveRenderer from "./stave_renderer.js";
import ClaviatureView from "./claviature_view";
import GameButton from "./game_button.js";
import CollapsableContainer from "./collapsable_container.js";

const successMp3Url = require("file!../../resources/success.mp3");

export default class PitchReadingView extends Component {

  propTypes: {
    statisticService: React.PropTypes.object.isRequired,
    settings: React.PropTypes.object.isRequired,
    isActive: React.PropTypes.bool.isRequired,
  }


  static childContextTypes = {
    isInActiveView: React.PropTypes.bool
  }

  getChildContext() {
    return {
      isInActiveView: this.props.isActive
    };
  }

  componentDidMount() {
    this.midiService = new MidiService({
      successCallback: this.onSuccess.bind(this),
      failureCallback: this.onFailure.bind(this),
      errorCallback: this.onError.bind(this),
      errorResolveCallback: this.onErrorResolve.bind(this),
    });
    this.startDate = new Date();
    this.midiService.setDesiredKeys(this.getAllCurrentKeys(), this.state.currentKeySignature);

    const debugMode = false;
    if (debugMode) {
      this.debugKeyUpCallback = (event) => {
        const yesKeyCode = 89;
        const noKeyCode = 78;
        if (event.keyCode === yesKeyCode) {
          this.onSuccess();
        } else if (event.keyCode === noKeyCode) {
          this.onFailure();
        }
      };
      document.addEventListener("keyup", this.debugKeyUpCallback);
    }
  }

  componentWillUnmount() {
    document.removeEventListener("keyup", this.debugKeyUpCallback);
  }

  componentWillReceiveProps(nextProps) {
    function checkIfSomePropChanged(oldObj, newObj, keys) {
      return keys.some((key) => _.at(oldObj, key) !== _.at(newObj, key));
    }

    const nextSettings = nextProps.settings;
    const prevSettings = this.props.settings;

    if (nextSettings !== prevSettings) {
      const nextChordSizeRanges = nextSettings.chordSizeRanges;
      const chordSizeRanges = prevSettings.chordSizeRanges;

      let newCurrentKeys = this.state.currentKeys;
      let keySignature = this.state.currentKeySignature;

      let shouldRegenerateAll = checkIfSomePropChanged(
        prevSettings,
        nextSettings,
        ["useAccidentals", "useAutomaticDifficulty", "automaticDifficulty.newNotesShare"]
      );

      if (shouldRegenerateAll ||
        nextChordSizeRanges.treble !== chordSizeRanges.treble ||
        nextChordSizeRanges.bass !== chordSizeRanges.bass) {
        newCurrentKeys = this.generateNewBars(nextSettings);
      }
      if (shouldRegenerateAll || !_.isEqual(prevSettings.keySignature, nextSettings.keySignature)) {
        keySignature = BarGenerator.generateKeySignature(nextSettings);
      }

      this.setState({
        currentChordIndex: 0,
        currentKeys: newCurrentKeys,
        currentKeySignature: keySignature,
      });
      this.startDate = new Date();
    }
  }

  generateNewBars(settings) {
    const levelIndex = 4;
      // LevelService.getLevelOfUser(this.props.statisticService.getAllEvents()) + 1;
    const level = LevelService.getLevelByIndex(levelIndex);
    return BarGenerator.generateBars(settings, settings.useAutomaticDifficulty ? level : null);
  }

  generateNewBarState() {
    return {
      finished : false,
      currentChordIndex: 0,
      currentKeys: this.generateNewBars(this.props.settings),
      currentKeySignature: BarGenerator.generateKeySignature(this.props.settings)
    };
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      errorMessage: null,
      running: false,
      ...(this.generateNewBarState())
    };
  }

  startStopTraining() {
    AnalyticsService.sendEvent(
      'PitchReading',
      this.state.running ? "Stop" : "Start"
    );
    this.setState({running: !this.state.running});
    this.startDate = new Date();
  }



  componentDidUpdate() {

    this.midiService.setDesiredKeys(this.getAllCurrentKeys(), this.state.currentKeySignature);
  }


  onError(msg) {
    console.error.apply(console, arguments);
    this.setState({errorMessage: msg});
  }


  onErrorResolve() {
    this.setState({errorMessage: null});
  }


  getAllCurrentKeys() {
    return _.compact(_.flatten(["treble", "bass"].map((clef) => {
      const note = this.state.currentKeys[clef][this.state.currentChordIndex];
      // Ignore rests
      return note.noteType !== "r" ? note.getKeys() : null;
    })));
  }


  onSuccess() {
    if (!this.state.running) {
      return;
    }
    const event = {
      success: true,
      keys: this.getAllCurrentKeys(),
      keySignature: this.state.currentKeySignature,
      time: new Date() - this.startDate,
    };
    this.startDate = new Date();

    this.props.statisticService.register(event);

    if (this.finished){
 
    }
    else if (this.state.currentChordIndex + 1 >= this.state.currentKeys.treble.length) {

      this.setState({
        currentChordIndex: this.state.currentChordIndex,
        finished : true
      });

      setTimeout(
        function(){
          this.setState({...(this.generateNewBarState())})
        }.bind(this),
        700
      );

    } else {
      // console.log("Updated: " + (new Date()).getTime());
      this.setState({
        currentChordIndex: this.state.currentChordIndex + 1,
      });
    }

    AnalyticsService.sendEvent('PitchReading', "success");
  }


  playSuccessSound() {
    this.refs.successPlayer.play();
  }


  onFailure() {
    if (!this.state.running) {
      return;
    }

    this.props.statisticService.register({
      success: false,
      keys: this.getAllCurrentKeys(),
      time: new Date() - this.startDate,
      keySignature: this.state.currentKeySignature,
    });
    AnalyticsService.sendEvent('PitchReading', "failure");
  }

   render() {
    const claviatureContainerClasses = classNames({
      "content-box": true,
      "claviature-container": true
    });

    const isMidiAvailable = this.props.settings.midi.inputs.get().length > 0;
    const noErrors = this.state.errorMessage !== null;
    const miniClaviature = (isMidiAvailable && noErrors)
     ? null :
     <ClaviatureView
       desiredKeys={this.getAllCurrentKeys()}
       keySignature={this.state.currentKeySignature}
       successCallback={this.onSuccess.bind(this)}
       failureCallback={this.onFailure.bind(this)}
       disabled={!this.state.running}
      />;

    const startStopButton = <GameButton
      label={`${this.state.running ? "Stop" : "Start"} training`}
      shortcutLetter='s'
      primary
      onClick={this.startStopTraining.bind(this)}
    />;

    const midiSetUpText = <p>
      {`The generated notes will be so that you play only one note at a time.
      If you want to practice chords, have a look into the `}
      <a href="https://github.com/philippotto/Piano-Trainer#how-to-use">
        Set Up
      </a>
      {" section to hook up your digital piano."}
    </p>;

    const welcomeText = <CollapsableContainer collapsed={this.state.running}>
      <div className={classNames({
        welcomeText: true,
      })}>
        <p>
           {"When you hit Start, notes will be displayed in the stave above. "}
           {isMidiAvailable ?
              "Since we found a connected piano, you can use it to play the notes. " :
              "Just use the mini claviature below to play the notes. "
           }
           {"Don't worry about the rhythm or speed for now."}
        </p>
        {isMidiAvailable ? null : midiSetUpText}
      </div>
    </CollapsableContainer>;

    const emptyKeySet = {
      treble: [],
      bass: []
    };

    return (
      <div className={classNames({trainer: true, "trainerHidden1": !this.props.isActive})}>
        <div className="row center-lg center-md center-sm center-xs">
          <div className="col-lg col-md col-sm col-xs leftColumn">
            <div>
              <div className="game-container content-box">
                <StaveRenderer
                  keys={this.state.running ? this.state.currentKeys : emptyKeySet}
                  chordIndex={this.state.currentChordIndex}
                  finished={this.state.finished}
                  keySignature={this.state.currentKeySignature}
                />

                <div className={classNames({
                  "row center-xs": true,
                })}>
                  <div className="col-xs-12">
                    {welcomeText}
                    {startStopButton}
                  </div>
                </div>
              </div>
              <div className="content-box">
                <div className="row">
                  <div className="col-xs-3" id="note1" style={{height:'40px',backgroundColor:(this.state.currentChordIndex > 0) ? '#398439' : '#FFFFFF'}}/>  
                  <div className="col-xs-3" id="note1" style={{height:'40px',backgroundColor:(this.state.currentChordIndex > 1) ? '#398439' : '#FFFFFF'}}/>  
                  <div className="col-xs-3" id="note1" style={{height:'40px',backgroundColor:(this.state.currentChordIndex > 2) ? '#398439' : '#FFFFFF'}}/>  
                  <div className="col-xs-3" id="note1" style={{height:'40px',backgroundColor:(this.state.currentChordIndex > 2 && this.state.finished) ? '#398439' : '#FFFFFF'}}/>  
                </div>
              </div>
 
            </div>
          </div>
          <div className="col-lg-4 col-md-12 col-sm-12 col-xs-12 rightColumn">
            <PitchSettingsView settings={this.props.settings} />
            <PitchStatisticView
              statisticService={this.props.statisticService}
              settings={this.props.settings} />
          </div>
         </div>
      </div>
    );
  }

}
