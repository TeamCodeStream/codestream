import React, { useCallback, useState } from "react";
import cx from "classnames";
import { CodeStreamState } from "../store";
import { useDispatch, useSelector } from "react-redux";
import { useDidMount } from "../utilities/hooks";
import { Button } from "../src/components/Button";
import styled from "styled-components";
import { acceptTOS } from "../store/session/actions";
import { Checkbox } from "../src/components/Checkbox";
import { Link } from "../Stream/Link";

const Root = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
	background: var(--base-background-color);
	ol {
		list-style-type: none;
		counter-reset: item;
		margin: 0;
		padding: 0;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style-type: disc;
	}
	ol > li {
		display: table;
		counter-increment: item;
		margin-bottom: 0.6em;
	}
	ol > li:before {
		content: counters(item, ".") ". ";
		display: table-cell;
		padding-right: 0.6em;
	}
	li ol > li {
		margin: 0;
	}
	li ol > li:before {
		content: counters(item, ".") " ";
	}
	hr {
		height: 1px;
		border: none;
		border-bottom: 1px solid var(--base-border-color);
		margin: 10px 0;
	}
`;

const Terms = styled.div`
	overflow: auto;
	flex-grow: 10;
	padding: 0 20px;
	background: var(--app-background-color);
	border-top: 1px solid var(--base-border-color);
	border-bottom: 1px solid var(--base-border-color);
	color: var(--text-color-subtle);
`;

const Title = styled.div`
	font-size: larger;
	padding: 20px;
	border-top: 1px solid var(--base-border-color);
`;

const Subtitle = styled.div`
	margin: 20px;
	font-size: larger;
`;

const Agreement = styled.div`
	margin: 10px 20px 0 20px;
`;

export const ButtonRow = styled.div`
	text-align: center;
	button {
		margin: 20px auto;
	}
`;

const PleaseScrollMore = styled.div`
	margin: 10px 0 0 0;
`;

const DownloadLink = styled.div`
	text-align: right;
	margin: 5px 10px 0 0;
`;

export const PresentTOS = () => {
	const dispatch = useDispatch();

	const [scrolledFarEnough, setScrolledFarEnough] = React.useState(false);
	const [inAgreement, setInAgreement] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);

	const handleScroll = event => {
		const { target } = event;
		const offBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
		if (offBottom < 30) setScrolledFarEnough(true);
	};

	const accept = async (event: React.SyntheticEvent) => {
		setIsLoading(true);
		await dispatch(acceptTOS());
		setIsLoading(false);
	};

	return (
		<Root>
			<Title>CodeStream Terms of Service</Title>
			<Terms onScroll={handleScroll}>
				<p>
					CodeStream, Inc. (“CodeStream”) and New Relic, Inc. (“New Relic”) are excited to announce
					that have entered into a definitive agreement for the acquisition of CodeStream.
					Contingent upon the successful completion of the transaction and effective as of
					immediately prior to the closing(the “Transaction Effective Date”), you agree to: (i) the
					New Relic Terms of Service for CodeStream, (ii) to the sharing and sale of the Personal
					Data collected pursuant to the{" "}
					<Link href="https://codestream.com/privacy-policy-02-2019">
						CodeStream Privacy Notice
					</Link>{" "}
					to New Relic (and its agents and advisors) in connection with the sale for the purposes
					disclosed in the{" "}
					<Link href="https://codestream.com/privacy">New Relic Privacy Notice for CodeStream</Link>
					. For the avoidance of doubt, this Agreement (as defined below) will be null and void if
					the transaction is not completed for any reason.
				</p>
				<p>
					This New Relic Terms of Service for CodeStream (“Agreement”) is entered into by and
					between New Relic, Inc. (“New Relic”) and the entity or person accessing the CodeStream
					Service (“Customer” or “you”). Certain capitalized terms are defined in Section 19
					(Definitions) and others are defined contextually in this Agreement. If you are accessing
					or using the CodeStream Service on behalf of your company, you represent that you are
					authorized to accept this Agreement on behalf of your company, and all references to
					“Customer” or “you” reference your company.
				</p>
				<p>
					The “Effective Date” of this Agreement is the date of Customer’s initial access to the
					CodeStream Service through any online provisioning, registration or order process on or
					after the Transaction Effective Date. New Relic may modify this Agreement from time to
					time as permitted in Section 15 (Modifications to Agreement).
				</p>
				<p>
					<b>
						By indicating your acceptance of this Agreement or accessing or using the CodeStream
						Service, you are agreeing to be bound by the terms and conditions of this Agreement.
						Each party expressly agrees that this Agreement is legally binding upon it.
					</b>
				</p>
				<hr />
				<ol>
					<li>
						CodeStream Service. This Agreement governs use of New Relic’s proprietary CodeStream
						Service. The CodeStream Service is not a part of New Relic One or New Relic’s other
						cloud services described <Link href="https://newrelic.com/">here</Link> (“New Relic
						Services”). Use of the New Relic Services requires a separate agreement with New Relic
						(“Subscription Agreement”).
					</li>
					<li>
						Using the CodeStream Service.
						<ol>
							<li>
								Permitted Use. Subject to this Agreement, during the Term, Customer may access and
								use the CodeStream Service solely for its internal business purposes
							</li>
							<li>
								Usage Limits. In using the CodeStream Service, Customer must comply with the
								technical documentation or other instructions provided by New Relic from time to
								time (“Documentation”), as well as usage limits specified by New Relic.
							</li>
							<li>
								Restrictions. As conditions on Customer’s rights in Section 2.1 (Permitted Use),
								Customer will not (and will not permit anyone else to) do any of the following: (a)
								provide access to, distribute, sell or sublicense the CodeStream Service to a third
								party, (b) use the CodeStream Service on behalf of, or to provide any product or
								service to, third parties, (c) use the CodeStream Service to develop a similar or
								competing product or service, (d) reverse engineer, decompile, disassemble or seek
								to access the source code, underlying ideas, algorithms, file formats or non-public
								APIs to the CodeStream Service, except to the extent expressly permitted by Law (and
								then only with prior notice to New Relic), (e) modify or create derivative works of
								the CodeStream Service, or copy any element of the CodeStream Service (other than
								authorized copies of any CodeStream Service software), (f) remove or obscure any
								proprietary notices in the CodeStream Service, (g) publish benchmarks or performance
								information about the CodeStream Service or (h) use the CodeStream Service in
								violation of the AUP. New Relic reserves the right, but not the obligation, to
								monitor or review your use of the CodeStream Service at any time and may investigate
								any suspected violations of this Agreement.
							</li>
							<li>
								Plugins. New Relic provides Plugins for use with the CodeStream Service, which are
								governed by the open source licenses for such Plugins, not this Agreement.
							</li>
						</ol>
					</li>
					<li>
						Feedback. If Customer provides New Relic with any comments, suggestions or other
						feedback regarding the CodeStream Service (“Feedback”), then New Relic may use such
						Feedback without restriction or obligation to Customer.
					</li>
					<li>
						Confidentiality. “Confidential Information” means any technical or performance
						information about the CodeStream Service, all Feedback, this Agreement and any other
						information disclosed by New Relic that is marked as confidential or proprietary or that
						should reasonably be understood to be confidential or proprietary from the circumstances
						of disclosure. Confidential Information does not include any information that: (a) is or
						becomes generally known to the public; (b) was known to Customer before its disclosure
						by New Relic; or (c) is received from a third party, in each case without breach of an
						obligation owed to New Relic or anyone else. Customer will (i) maintain Confidential
						Information in confidence (using at least the same measures as for Customer’s own
						confidential information, and no less than reasonable care) and not divulge it to any
						third party and (ii) only use Confidential Information to fulfill its obligations and
						exercise its rights under this Agreement. If Customer is compelled by Law to disclose
						Confidential Information, it must provide New Relic with prior notice of such compelled
						disclosure (to the extent legally permitted) and reasonable assistance if New Relic
						wishes to contest the disclosure. If Customer breaches or threatens to breach this
						Section 4, it could cause substantial harm for which damages are inadequate and New
						Relic will have the right to seek injunctive relief in addition to other remedies.
					</li>
					<li>
						Fees. There are currently no fees due for use of the CodeStream Service in accordance
						with this Agreement during the Term. New Relic may introduce fees in the future pursuant
						to Section 15 (Modifications to Agreement).
					</li>
					<li>
						Customer Data.
						<ol>
							<li>
								Use of Customer Data. As between the parties, Customer will retain any of its rights
								in the Customer Data provided to New Relic. Subject to the terms of this Agreement,
								Customer hereby grants to New Relic a non-exclusive, worldwide, royalty-free right
								to use, copy, store and transmit Customer Data and to modify and create derivative
								works of the Customer Data (e.g., for dashboards, charts and graphs) to the extent
								necessary to provide the CodeStream Service. This includes internal use for product
								support and improvement.
							</li>
							<li>
								Rights in Customer Data. Customer is solely responsible for the accuracy, content
								and legality of all Customer Data. Customer represents and warrants to New Relic
								that (a) Customer has made all disclosures and has sufficient rights to use the
								Customer Data with the CodeStream Service and grant the rights in Section 6.1 (Use
								of Customer Data) and (b) the provision and use of the Customer Data does not
								infringe or violate applicable laws or the intellectual property, publicity, privacy
								or other rights of any third party.
							</li>
							<li>
								Prohibited Data. Customer must not use the CodeStream Service with Prohibited Data.
								Customer acknowledges that the CodeStream Service is not intended to meet any legal
								obligations for these uses, including HIPAA, and that New Relic is not a Business
								Associate as defined under HIPAA in connection with the CodeStream Services.
								Notwithstanding anything else in this Agreement, New Relic has no liability for
								Prohibited Data.
							</li>
							<li>
								Personal Data. To the extent Personal Data is included in the Customer Data that New
								Relic processes on behalf of the Customer as a Data Processor in the course of
								providing the CodeStream Services which relates to Data Subjects from the European
								Economic Area (EEA), the United Kingdom, and Switzerland, New Relic will enter into
								a Data Processing Addendum with Standard Contractual Clauses (“DPA”). To request a
								DPA please email{" "}
								<Link href="mailto:dataprivacy@newrelic.com">dataprivacy@newrelic.com</Link>.
							</li>
						</ol>
					</li>
					<li>
						User Data and Login Credentials. Your employees and contractors may use the CodeStream
						Service on your behalf (each, a “User”). Each User may be required to provide a
						username, email address, password or other personal information to create and manage an
						account (“Login Credentials”) and must keep its Login Credentials confidential and not
						share them with anyone. New Relic uses and collects Login Credentials in accordance with
						the{" "}
						<Link href="https://codestream.com/privacy">
							New Relic Privacy Notice for CodeStream
						</Link>
						. Customer is responsible for its Users’ compliance with this Agreement and the actions
						taken through their accounts. Customer will promptly notify New Relic if it becomes
						aware of any compromise of its Login Credentials.
					</li>
					<li>
						Separate Platforms. Customer may choose to use the CodeStream Service with Separate
						Platforms, including the New Relic Services. Use of Separate Platforms is subject to
						Customer’s agreement with the relevant provider and not this Agreement. If Customer
						enables a Separate Platform with the CodeStream Service, New Relic may access and
						exchange Customer Data with the Separate Platform on Customer’s behalf. New Relic does
						not control and has no liability for Separate Platforms, including their security,
						functionality, operation, availability or interoperability or how the Separate Platforms
						or their providers use Customer Data (unless agreed in the Subscription Agreement for
						the New Relic Services themselves).
					</li>
					<li>
						Ownership. Customer agrees that New Relic or its suppliers retain all right, title and
						interest (including all patent, copyright, trademark, trade secret and other
						intellectual property rights) in and to the CodeStream Service and any and all related
						and underlying technology and documentation and any derivative works, modifications or
						improvements of any of the foregoing, including as may incorporate Feedback. In addition
						to its other rights, New Relic may collect technical logs, data and learnings about
						Customer’s use of the CodeStream Service, which New Relic may use without restriction.
						Except as expressly set forth in this Agreement, no rights in the CodeStream Service,
						the New Relic Services, or any New Relic technology are granted to Customer.
					</li>
					<li>
						Termination and Suspension. This Agreement will start on the Effective Date and will
						terminate upon either party’s notice to the other of termination of this Agreement (with
						or without cause) (“Term”). New Relic may also suspend this Agreement or Customer’s use
						of the CodeStream Service for no reason or any reason upon notice to Customer. Upon
						termination, Customer must cease using the CodeStream Service, and, at New Relic’s
						request, return or destroy (and certify destruction of) any Documentation or other
						Confidential Information provided by New Relic. After termination, Customer will have no
						further access to any Customer Data, and New Relic may delete Customer Data in
						accordance with its standard policies and procedures. New Relic will not have any
						liability resulting from termination or suspension of this Agreement in accordance with
						its terms. Sections 2.3 (Restrictions), 3 (Feedback), 4 (Confidentiality), 6 (Customer
						Data), 8 (Separate Platforms) (with respect to disclaimers), 9 (Ownership), 10
						(Termination and Suspension), 11 (Disclaimers), 12 (Limitations of Liability), 17
						(Export Restrictions), 18 (General) and 19 (Definitions) will survive termination of
						this Agreement.
					</li>
					<li>
						Disclaimers. The CodeStream Service is provided “AS IS” and “AS AVAILABLE”, and use is
						at Customer’s sole discretion and risk. NEW RELIC DISCLAIMS ALL WARRANTIES, EXPRESS OR
						IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTY OF TITLE, NON-INFRINGEMENT,
						MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, IN RELATION TO THE CODESTREAM
						SERVICE OR THEIR USE. NEW RELIC HAS NO WARRANTY, SUPPORT, MAINTENANCE, STORAGE, SERVICE
						LEVEL, SECURITY OR INDEMNITY OBLIGATIONS FOR THE CODESTREAM SERVICE OR OTHERWISE UNDER
						THIS AGREEMENT.
					</li>
					<li>
						Limitations of Liability. NEW RELIC WILL NOT BE LIABLE FOR ANY LOSS OF USE, LOST OR
						INACCURATE DATA, FAILURE OF SECURITY MECHANISMS, INTERRUPTION OF BUSINESS, COSTS OF
						DELAY OR ANY OTHER DIRECT, INDIRECT, CONSEQUENTIAL, SPECIAL, EXEMPLARY, PUNITIVE, OR
						OTHER LIABILITY RELATED TO THE CODESTREAM SERVICE OR THEIR USE, WHETHER IN CONTRACT,
						TORT OR ANY OTHER LEGAL THEORY. IF THE FOREGOING DISCLAIMER OF DIRECT DAMAGES IS NOT
						ENFORCEABLE AT LAW, NEW RELIC’S ENTIRE AGGREGATE LIABILITY UNDER THIS AGREEMENT WILL BE
						LIMITED TO FIFTY U.S. DOLLARS (US $50.00). THESE LIMITATIONS OF LIABILITY WILL APPLY
						NOTWITHSTANDING ANY FAILURE OF ESSENTIAL PURPOSE OF ANY LIMITED REMEDY AND TO THE
						FULLEST EXTENT PERMITTED BY LAW.
					</li>
					<li>
						Indemnification. Customer shall indemnify, defend and hold harmless New Relic from and
						against any and all claims, costs, damages, losses, liabilities and expenses (including
						reasonable attorneys’ fees and costs) arising out of or in connection with (a)
						Customer’s use of the CodeStream Service, (b) Customer’s breach of this Agreement, and
						(c) any Customer Data. New Relic may participate in the defense and settlement of any
						claim with its own counsel and at its own expense. Customer may not settle a claim
						without New Relic’s prior written consent (not to be unreasonably withheld).
					</li>
					<li>
						Third-Party Open Source. The Plugins may incorporate third-party open source software
						(“Third-Party Open Source”), as listed in the Documentation or by New Relic upon
						request. To the extent required by the applicable open source license, that license will
						apply to the Third-Party Open Source on a stand-alone basis instead of this Agreement.
					</li>
					<li>
						Modifications to Agreement. New Relic may modify this Agreement from time to time. New
						Relic will use reasonable efforts to notify Customer of modifications as provided in
						Section 16 (Notices). Customer may be required to click through the modified Agreement
						to show its acceptance and in any event Customer’s continued use of the CodeStream
						Service after the modification constitutes Customer’s acceptance to the modifications.
						If Customer does not agree to the modified Agreement, Customer’s sole remedy is to
						terminate its use of the CodeStream Service as described in Section 10 (Termination and
						Suspension).
					</li>
					<li>
						Notices. New Relic may provide Customer with notices and communications at Customer’s
						email or physical address on file, through the CodeStream Service or other reasonable
						means. Any notices or communications to New Relic must be sent to 188 Spear Street,
						Suite 1000, San Francisco, CA 94105.
					</li>
					<li>
						Export Restrictions. Customer agrees to comply with all relevant U.S. and foreign export
						and import Laws in using the CodeStream Service. Customer (a) represents and warrants
						that it is not listed on any U.S. government list of prohibited or restricted parties or
						located in (or a national of) a country that is subject to a U.S. government embargo or
						that has been designated by the U.S. government as a “terrorist supporting” country, (b)
						agrees not to access or use the CodeStream Service in violation of any U.S. export
						embargo, prohibition or restriction and (c) will not submit to the CodeStream Service
						any information controlled under the U.S. International Traffic in Arms Regulations.
					</li>
					<li>
						General. This Agreement is the parties’ entire agreement and supersede any prior or
						contemporaneous agreements relating to its subject matter. Except as otherwise provided
						herein, all amendments or modifications must be in writing and signed by both parties.
						The words “including” and similar terms are to be construed without limitation. Failure
						to enforce any provision is not a waiver and all waivers must be in writing. If any
						provision is found to be unenforceable it (and related provisions) will be interpreted
						to best accomplish its intended purpose. Customer may not assign, transfer or delegate
						any right or obligations under this Agreement and any non-permitted assignment is void.
						New Relic may assign this Agreement and its rights and obligations to any of its
						affiliates or in connection with a merger, reorganization, acquisition or other transfer
						of all or substantially all of its assets or voting securities to which this Agreement
						relates. This Agreement will be governed by and construed under the laws of the State of
						California, as applied to agreements entered into and to be performed in California by
						California residents. The parties consent to the exclusive jurisdiction and venue of the
						courts located in and serving San Francisco, California. New Relic will not be liable to
						Customer for any delay or failure to perform any obligation under this Agreement if the
						delay or failure is due to unforeseen events that are beyond its reasonable control. The
						CodeStream Service includes commercial computer software. If the user or licensee of
						such technology is an agency, department, or other entity of the United States
						Government, the use, duplication, reproduction, release, modification, disclosure or
						transfer of such technology, or any related documentation of any kind, including
						technical data and manuals, is restricted by this Agreement in accordance with Federal
						Acquisition Regulation 12.212 for civilian purposes and Defense Federal Acquisition
						Regulation Supplement 227.7202 for military purposes. the CodeStream Service were
						developed fully at private expense. All other use is prohibited.
					</li>
					<li>
						Definitions.
						<ul>
							<li>
								“AUP” means the New Relic Acceptable Use Policy, the current version of which is
								available <Link href="https://codestream.com/aup">here</Link>.
							</li>
							<li>
								“CodeStream Service” means New Relic’s proprietary cloud deployment of CodeStream.
								The CodeStream Service includes the Documentation and Plugins, but not Separate
								Platforms.
							</li>
							<li>
								“Customer Data” means any data, content or materials that Customer submits to the
								CodeStream Service.
							</li>
							<li>
								“Data Processor”, “Data Subject” and “process” have the meanings given to them under
								GDPR/UK GDRP.
							</li>
							<li>
								“Law” means all relevant local, state, federal and international laws, regulations
								and conventions, including those related to data privacy and data transfer,
								international communications and export of technical or personal data.
							</li>
							<li>
								“Personal Data” means any information relating to an identified or identifiable
								natural person (data subject).
							</li>
							<li>
								“Plugins” means any on-premises software that New Relic provides to Customer as part
								of the CodeStream Service.
							</li>
							<li>
								“Prohibited Data” means any (a) special categories of data enumerated in European
								Union Regulation 2016/679, Article 9(1) or any successor legislation, (b) patient,
								medical or other protected health information regulated by the Health Insurance
								Portability and Accountability Act (as amended and supplemented) (“HIPAA”), (c)
								credit, debit or other payment card data or financial account information, including
								bank account numbers, (d) credentials granting access to an online account (e.g.,
								username plus password), (e) social security numbers, driver’s license numbers or
								other government ID numbers, (f) other information subject to regulation or
								protection under specific Laws such as the Children’s Online Privacy Protection Act
								or Gramm-Leach-Bliley Act (or related rules or regulations) or (g) any data similar
								to the above protected under foreign or domestic Laws.
							</li>
							<li>
								“Separate Platform” means any platform, add-on, service or product not provided by
								New Relic as part of the CodeStream Service and that Customer elects to integrate or
								enable for use with the CodeStream Service.
							</li>
						</ul>
					</li>
				</ol>
				<br />
				<br />
				Prior Versions:
				<br />
				<Link href="https://codestream.com/terms-01-2019">January 2, 2019</Link>
				<br />
				<br />
			</Terms>
			<DownloadLink>
				<Link href="https://codestream.com/terms">Download</Link>
			</DownloadLink>
			<Agreement>
				{scrolledFarEnough ? (
					<Checkbox
						name="agree"
						checked={inAgreement}
						onChange={() => setInAgreement(!inAgreement)}
					>
						I agree to the above terms of service and{" "}
						<Link href="https://codestream.com/privacy">Privacy Policy</Link>
					</Checkbox>
				) : (
					<PleaseScrollMore>
						Please scroll through the entire agreement to proceed.
					</PleaseScrollMore>
				)}
				<ButtonRow>
					<Button isLoading={isLoading} disabled={!inAgreement} onClick={accept}>
						Continue
					</Button>
				</ButtonRow>
			</Agreement>
		</Root>
	);
};
