// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./SampleGallery.scss";
import * as React from "react";

import { Icon, Link } from "@fluentui/react";

import { GlobalKey } from "../../constants";
// import {
//   TelemetryEvent,
//   TelemetryProperty,
//   TelemetryTriggerFrom,
// } from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { SampleFilterOptionType, SampleGalleryState, SampleInfo } from "./ISamples";
import OfflinePage from "./offlinePage";
import SampleCard from "./sampleCard";
import SampleDetailPage from "./sampleDetailPage";
import SampleFilter from "./sampleFilter";
import SampleListItem from "./sampleListItem";

const Fuse = require('fuse.js');

interface SampleGalleryProps {
  shouldShowChat: string;
}

export default class SampleGallery extends React.Component<SampleGalleryProps, SampleGalleryState> {
  private samples: SampleInfo[] = [];
  private filterOptions: SampleFilterOptionType = {
    capabilities: [],
    languages: [],
    platform: [],
  };

  constructor(props: SampleGalleryProps) {
    super(props);
    this.state = {
      loading: true,
      layout: "grid",
      query: "",
      filterTags: [],
    };
  }

  public componentDidMount() {
    window.addEventListener("message", this.messageHandler, false);
    vscode.postMessage({
      command: Commands.LoadSampleCollection,
    });
    vscode.postMessage({
      command: Commands.GetData,
      data: {
        key: GlobalKey.SampleGalleryLayout,
      },
    });
  }

  public render() {

    const titleSection = (
      <div id="title">
        <div className="logo">
          <Icon iconName="Library" className="logo" />
        </div>
        <div className="title">
          <h1>Samples</h1>
          {this.props.shouldShowChat === "true" ? (
            <h3>
              Explore our sample gallery filled with solutions that work seamlessly with Azure AI Speech
              Toolkit. Need help choosing? Let{" "}
              <Link
                onClick={() => {
                  this.onInvokeTeamsAgent();
                }}
              >
                Github Copilot
              </Link>{" "}
              assists you in selecting the right sample to create your Teams app.
            </h3>
          ) : (
            <h3>
              Explore our sample gallery filled with solutions that work seamlessly with Azure AI Speech Toolkit.
            </h3>
          )}
        </div>
      </div>
    );
    if (this.state.loading) {
      return <div className="sample-gallery">{titleSection}</div>;
    } else if (this.selectedSample) {
      return (
        <SampleDetailPage
          sample={this.selectedSample}
          selectSample={this.onSampleSelected}
          createSample={this.onCreateSample}
          viewGitHub={this.onViewGithub}
          upgradeToolkit={this.onUpgradeToolkit}
        />

      );
    } else {
      const ScenarioSamples = (this.state.filteredSamples ?? this.samples).filter(
        (sample) => sample.scenario
      );
      const quickstartSamples = (this.state.filteredSamples ?? this.samples).filter(
        (sample) => !sample.scenario
      );
      return (
        <div className="sample-gallery">
          {titleSection}
          {this.state.error !== undefined ? (
            <OfflinePage />
          ) : (
            <>
              <SampleFilter
                samples={this.samples}
                filterOptions={this.filterOptions}
                layout={this.state.layout}
                query={this.state.query}
                filterTags={this.state.filterTags}
                onLayoutChanged={this.onLayoutChanged}
                onFilterConditionChanged={this.onFilterConditionChanged}
              ></SampleFilter>
              {ScenarioSamples.length > 0 && (
                <div className="sample-section-with-title">
                  <h4>Scenarios and use cases</h4>
                  <div className={`sample-section ${this.state.layout}`}>
                    {this.state.layout === "grid"
                      ? ScenarioSamples.map((sample: SampleInfo) => {
                          return (
                            <SampleCard
                              key={sample.id}
                              sample={sample}
                              selectSample={this.onSampleSelected}
                              createSample={this.onCreateSample}
                              viewGitHub={this.onViewGithub}
                              upgradeToolkit={this.onUpgradeToolkit}
                            />
                          );
                        })
                      : ScenarioSamples.map((sample: SampleInfo) => {
                          return (
                            <SampleListItem
                              key={sample.id}
                              sample={sample}
                              selectSample={this.onSampleSelected}
                              createSample={this.onCreateSample}
                              viewGitHub={this.onViewGithub}
                              upgradeToolkit={this.onUpgradeToolkit}
                            />
                          );
                        })}
                  </div>
                </div>
              )}
              {ScenarioSamples.length > 0 && quickstartSamples.length > 0 && (
                <div>
                  <hr />
                </div>
                )}
              {quickstartSamples.length > 0 && (
                <div className="sample-section-with-title">
                  <h4>Speech features and capabilities</h4>
                  <div className={`sample-section ${this.state.layout}`}>
                    {this.state.layout === "grid"
                      ? quickstartSamples.map((sample: SampleInfo) => {
                          return (
                            <SampleCard
                              key={sample.id}
                              sample={sample}
                              selectSample={this.onSampleSelected}
                              createSample={this.onCreateSample}
                              viewGitHub={this.onViewGithub}
                              upgradeToolkit={this.onUpgradeToolkit}
                            />
                          );
                        })
                      : quickstartSamples.map((sample: SampleInfo) => {
                          return (
                            <SampleListItem
                              key={sample.id}
                              sample={sample}
                              selectSample={this.onSampleSelected}
                              createSample={this.onCreateSample}
                              viewGitHub={this.onViewGithub}
                              upgradeToolkit={this.onUpgradeToolkit}
                            />
                          );
                        })}
                  </div>
                </div>)}
            </>
          )}
        </div>
      );
    }
  }

  private get selectedSample(): SampleInfo | null {
    if (!this.state.selectedSampleId || this.state.selectedSampleId === "") {
      return null;
    }
    const selectedSamples = this.samples.filter(
      (sample: SampleInfo) => sample.id == this.state.selectedSampleId
    );
    return selectedSamples.length > 0 ? selectedSamples[0] : null;
  }

  private messageHandler = (event: any) => {
    const message = event.data.message;
    switch (message) {
      case Commands.LoadSampleCollection:
        const error = event.data.error;
        this.samples = event.data.samples as SampleInfo[];
        this.filterOptions = event.data.filterOptions as SampleFilterOptionType;
        const initialSample = event.data.initialSample as string;
        this.setState({
          loading: false,
          error,
          selectedSampleId: initialSample,
        });
        break;
      case Commands.GetData:
        const key = event.data.data.key;
        const value = event.data.data.value;
        if (key === GlobalKey.SampleGalleryLayout) {
          this.setState({
            layout: value || "grid",
          });
        }
        break;
      default:
        break;
    }
  };

  private onSampleSelected = (id: string/*, triggerFrom: TelemetryTriggerFrom*/) => {
    // vscode.postMessage({
    //   command: Commands.SendTelemetryEvent,
    //   data: {
    //     eventName: "TelemetryEvent.SelectSample",
    //     properties: {
    //       // [TelemetryProperty.TriggerFrom]: triggerFrom,
    //       // [TelemetryProperty.SampleAppName]: id,
    //       // [TelemetryProperty.SearchText]: this.state.query,
    //       // [TelemetryProperty.SampleFilters]: this.state.filterTags.join(","),
    //       // [TelemetryProperty.Layout]: this.state.layout,
    //     },
    //   },
    // });
    this.setState({
      selectedSampleId: id,
    });
  };

  private onLayoutChanged = (newLayout: "grid" | "list") => {
    if (newLayout === this.state.layout) {
      return;
    }
    // vscode.postMessage({
    //   command: Commands.SendTelemetryEvent,
    //   data: {
    //     eventName: "TelemetryEvent.ChangeLayout",
    //     properties: {
    //       // [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.SampleGallery,
    //       // [TelemetryProperty.Layout]: newLayout,
    //       // [TelemetryProperty.SearchText]: this.state.query,
    //       // [TelemetryProperty.SampleFilters]: this.state.filterTags.join(","),
    //     },
    //   },
    // });
    vscode.postMessage({
      command: Commands.StoreData,
      data: {
        key: GlobalKey.SampleGalleryLayout,
        value: newLayout,
      },
    });
    this.setState({ layout: newLayout });
  };

  private onFilterConditionChanged = (query: string, filterTags: string[]) => {
    const containsTag = (targets: string[], tags: string[]) => {
      if (targets.length === 0) {
        return true;
      }
      for (const target of targets) {
        if (tags.findIndex((value) => value.toLowerCase() == target.toLowerCase()) >= 0) {
          return true;
        }
      }
      return false;
    };
    const capabilitiesFilter = filterTags.filter(
      (tag) => this.filterOptions.capabilities.indexOf(tag) >= 0
    );
    const languagesFilter = filterTags.filter(
      (tag) => this.filterOptions.languages.indexOf(tag) >= 0
    );
    const platformFilter = filterTags.filter(
      (tag) => this.filterOptions.platform.indexOf(tag) >= 0
    );
    let filteredSamples = this.samples.filter((sample: SampleInfo) => {
      return (
        containsTag(capabilitiesFilter, sample.tags) &&
        containsTag(languagesFilter, sample.tags) &&
        containsTag(platformFilter, sample.tags)
      );
    });
    if (query !== "") {
      const fuse = new Fuse(filteredSamples, {
        keys: ["title", "shortDescription", "fullDescription", "tags"],
      });
      filteredSamples = fuse.search(query).map((result: { item: SampleInfo }) => result.item);
    }
    this.setState({ query, filterTags, filteredSamples });
  };

  private onCreateSample = (sample: SampleInfo/*, triggerFrom: TelemetryTriggerFrom*/) => {
    // vscode.postMessage({
    //   command: Commands.SendTelemetryEvent,
    //   data: {
    //     eventName: "TelemetryEvent.CloneSample",
    //     properties: {
    //       // [TelemetryProperty.TriggerFrom]: triggerFrom,
    //       // [TelemetryProperty.SampleAppName]: sample.id,
    //       // [TelemetryProperty.SearchText]: this.state.query,
    //       // [TelemetryProperty.SampleFilters]: this.state.filterTags.join(","),
    //       // [TelemetryProperty.Layout]: this.state.layout,
    //     },
    //   },
    // });
    vscode.postMessage({
      command: Commands.CloneSampleApp,
      data: sample,
    });
  };

  private onViewGithub = (sample: SampleInfo/*, triggerFrom: TelemetryTriggerFrom*/) => {
    // vscode.postMessage({
    //   command: Commands.SendTelemetryEvent,
    //   data: {
    //     eventName: "TelemetryEvent.ViewSampleInGitHub",
    //     properties: {
    //       // [TelemetryProperty.TriggerFrom]: triggerFrom,
    //       // [TelemetryProperty.SampleAppName]: sample.id,
    //       // [TelemetryProperty.SearchText]: this.state.query,
    //       // [TelemetryProperty.SampleFilters]: this.state.filterTags.join(","),
    //       // [TelemetryProperty.Layout]: this.state.layout,
    //     },
    //   },
    // });
    vscode.postMessage({
      command: Commands.OpenExternalLink,
      data: sample.githubPath,
    });
  };

  private onUpgradeToolkit = (sample: SampleInfo/*, triggerFrom: TelemetryTriggerFrom*/) => {
    // vscode.postMessage({
    //   command: Commands.SendTelemetryEvent,
    //   data: {
    //     eventName:" TelemetryEvent.UpgradeToolkitForSample",
    //     properties: {
    //       // [TelemetryProperty.TriggerFrom]: triggerFrom,
    //       // [TelemetryProperty.SampleAppName]: sample.id,
    //     },
    //   },
    // });
    vscode.postMessage({
      command: Commands.UpgradeToolkit,
      data: {
        version: sample.minimumToolkitVersion,
      },
    });
  };

  private onInvokeTeamsAgent = () => {
    vscode.postMessage({
      command: Commands.InvokeTeamsAgent,
    });
  };
}
