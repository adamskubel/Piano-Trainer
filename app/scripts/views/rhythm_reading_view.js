import React, {Component} from "react";
import classNames from "classnames";
import _ from "lodash";

import BarGenerator from "../services/bar_generator.js";
import RhythmChecker from "../services/rhythm_checker.js";
import MetronomeService from "../services/metronome_service.js";

import StaveRenderer from "./stave_renderer.js";
import GameButton from "./game_button.js";
import RhythmSettingsView from "./rhythm_settings_view.js";
import BeatVisualization from "./beat_visualization.js";

const keyup = "keyup";
const keydown = "keydown";

const Phases = {
  welcome: "welcome",
  running: "running",
  feedback: "feedback",
};

export default class RhythmReadingView extends Component {

  propTypes: {
    settings: React.PropTypes.object.isRequired,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      errorMessage: null,
      result: {success: true},
      currentRhythm: BarGenerator.generateEmptyRhythmBar(),
      currentMetronomeBeat: -1,
      phase: Phases.welcome
    };
    this.beatHistory = [];
    this.keyHandlers = {};
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.phase === Phases.running && prevState.phase !== Phases.running) {
      this.playMetronome();
    } else {
      console.log("not running");
    }
  }

  playMetronome() {
    const beatLength = this.props.settings.barDuration / 4;
    const delay = 100; // give the scheduler a bit of time to start the jam
    const now = performance.now();
    const startTime = now + delay;
    console.log("startTime", startTime);
    const beatAmount = 8;
    const metronomeSoundLength = 180; // ms
    // Not sure when exactly the metronome beat is anticipated by a human
    // E.g. exactly on the first millisecond? For now I'm assuming at 1/3 of
    // playing time.
    const magicPercentileOfAudibleBeat = 0.33;
    // this is the first beat of the actual bar
    this.firstBarBeatTime = startTime + 4 * beatLength + metronomeSoundLength * magicPercentileOfAudibleBeat;

    _.range(beatAmount + 1).map((beatIndex) => {
      const beatTime = startTime + beatIndex * beatLength;
      const delay = beatTime - now;

      if (beatIndex < beatAmount) {
        MetronomeService.play(delay);
      }
      setTimeout(
        () => {
          this.setState({
            currentMetronomeBeat: beatIndex < 4 ? beatIndex : -1
          });

          if (beatIndex === beatAmount) {
            const expectedTimes = RhythmChecker.convertDurationsToTimes(
              this.state.currentRhythm.durations,
              this.props.settings.barDuration
            );
            this.fixBeatHistory();
            const result = RhythmChecker.compare(expectedTimes, this.beatHistory);

            this.setState({
              phase: Phases.feedback,
              result: result
            });
          }
        },
        delay
      )
    });
  }

  fixBeatHistory() {
    if (this.beatHistory.length === 0) {
      return;
    }
    // If the user pressed the very first beat it a bit too early,
    // we will round the time up to zero
    const firstBeat = this.beatHistory[0];
    if (firstBeat[0] < 0) {
      firstBeat[0] = 0;
    }

    // If the user doesn't release the key at the end of the bar,
    // we will add the up event to the beatHistory
    const lastBeat = this.beatHistory.slice(-1)[0];
    if (lastBeat.length === 1) {
      lastBeat.push(performance.now() - this.firstBarBeatTime);
    }
  }

  componentDidMount() {
    let lastSpaceEvent = keyup;
    const keyHandler = (eventType, event) => {
      const spaceCode = 32;
      if (event.keyCode !== spaceCode) {
        return;
      }
      if (this.state.phase === Phases.running) {
        // ignore consecutive events of the same type
        if (lastSpaceEvent === eventType) {
          return;
        }
        // protocol beat
        const newBeatTime = performance.now() - this.firstBarBeatTime;

        lastSpaceEvent = eventType;

        if (eventType === keydown) {
          this.beatHistory.push([newBeatTime]);
        } else {
          if (newBeatTime < 0) {
            // If the user hit the key and lifted it before the first beat
            // (which is way too early), we'll ignore it.
            this.beatHistory = [];
            return;
          }
          if (this.beatHistory.length === 0) {
            // Keydown event was not registered. Assume it was pressed on
            // firstBarBeatTime.
            this.beatHistory.push([this.firstBarBeatTime]);
          }
          this.beatHistory.slice(-1)[0].push(newBeatTime);
        }
      } else {
        console.log("lastSpaceEvent",  lastSpaceEvent);
        console.log("eventType",  eventType);
        if (lastSpaceEvent === keydown && eventType === keyup) {
          lastSpaceEvent = keyup;
          return;
        }
      }
    }

    [keydown, keyup].forEach((eventType) => {
      this.keyHandlers[eventType] = keyHandler.bind(null, eventType);
      document.addEventListener(eventType, this.keyHandlers[eventType]);
    });
  }

  componentWillUnmount() {
    [keydown, keyup].forEach((eventType) => {
      document.removeEventListener(eventType, this.keyHandlers[eventType]);
    });
  }

  repeatBar() {
    if (this.state.phase === Phases.running) {
      return;
    }
    this.beatHistory = [];
    this.setState({
      phase: Phases.running
    });
  }

  nextBar() {
    if (this.state.phase === Phases.running) {
      return;
    }
    this.beatHistory = [];
    const newRhythm = BarGenerator.generateRhythmBar(this.props.settings);

    this.setState({
      phase: Phases.running,
      currentRhythm: newRhythm
    });
  }


  render() {
    const messageContainerClasses = classNames({
      hide: this.state.errorMessage === null
    });

    const welcomeText = <div className={classNames({
        welcomeText: true,
        transition: true,
        heightOut: this.state.phase !== Phases.welcome
      })}>
      <h3>
        Welcome to this rhythm training!
      </h3>
      <p>
         When you start the training, we will count in for 4 beats and afterwards
         you can tap the given rhythm with your Space button.
        </p>
    </div>;

    const feedbackSection =
      <div className={classNames({
        feedbackText: true,
        transition: true,
        heightOut: this.state.phase !== Phases.feedback
      })}>
        <h2>
          {this.state.result.success ?
            "Yay! You nailed the rhythm!" :
            "Oh no, you didn't get the rhythm right :("
          }
        </h2>
        <h4 style={{marginTop: 0}}>
        Have a look at your performance:
        </h4>
        {<BeatVisualization
          currentRhythm={this.state.currentRhythm}
          settings={this.props.settings}
          beatHistory={this.beatHistory}
          result={this.state.result}
         />}
      </div>;

    console.log(this.state.currentRhythm.keys);

    const metronomeBeat =
     <h2 className={classNames({
      metronomeBeat: true,
      transition: true,
      heightOut: this.state.currentMetronomeBeat == -1,
      opacityOut: (this.state.currentMetronomeBeat + 1) % 4 === 0
     })}>
      {this.state.currentMetronomeBeat + 1}
    </h2>;

    const buttons =
      this.state.phase !== Phases.feedback ?
        <GameButton
           label="Start training" shortcutLetter='s' primary
           onClick={this.nextBar.bind(this)} />
      : (this.state.result.success ?
          <div>
            <GameButton
             label="Repeat this bar" shortcutLetter='r'
             onClick={this.repeatBar.bind(this)} />
            <GameButton
             label="Continue with a new bar" shortcutLetter='c'
             onClick={this.nextBar.bind(this)} primary />
          </div>
        :
          <div>
            <GameButton
             label="Repeat this bar" shortcutLetter='r'
             onClick={this.repeatBar.bind(this)} primary />
            <GameButton
             label="Skip this bar" shortcutLetter='s'
             onClick={this.nextBar.bind(this)} />
          </div>
      );

    return (
      <div className="trainer">
        <div className="row center-xs">
          <div className="col-xs-5">
            <div>
              <div className="transition game-container content-box">
                <StaveRenderer
                  keys={this.state.currentRhythm.keys}
                  chordIndex={this.state.currentChordIndex}
                  keySignature={"C"}
                  staveCount={1}
                />

                <div style={{textAlign: "center"}}>
                  {metronomeBeat}
                  {welcomeText}
                  {feedbackSection}
                </div>

                <div className={classNames({
                  "row center-xs": true,
                  transition: true,
                  gameButtonBar: true,
                  heightOut: this.state.phase === Phases.running
                })} style={{marginTop: 20}}>
                  <div className="col-xs-12">
                    {buttons}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xs-3 second-column">
            <RhythmSettingsView settings={this.props.settings} />
          </div>
        </div>
      </div>
    );
  }

}