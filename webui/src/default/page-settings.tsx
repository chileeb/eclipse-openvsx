/********************************************************************************
 * Copyright (c) 2020 TypeFox and others
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/

import * as React from 'react';
import { makeStyles } from '@material-ui/styles';
import { Link, Typography, Theme, Box } from '@material-ui/core';
import { Link as RouteLink, Route } from 'react-router-dom';
import GitHubIcon from '@material-ui/icons/GitHub';
import { PageSettings } from '../page-settings';
import { ExtensionListRoutes } from '../pages/extension-list/extension-list-container';
import { DefaultMenuContent, MobileMenuContent } from './menu-content';
import OpenVSXLogo from './openvsx-registry-logo';
import About from './about';
import { createAbsoluteURL } from '../utils';

export default function createPageSettings(theme: Theme, prefersDarkMode: boolean, serverUrl: string): PageSettings {
    const toolbarStyle = makeStyles({
        logo: {
            width: 'auto',
            height: '40px',
            marginTop: '8px'
        }
    });
    const toolbarContent: React.FunctionComponent = () =>
        <RouteLink to={ExtensionListRoutes.MAIN} aria-label={`Home - SmartIDE Marketplace`}>
            <OpenVSXLogo prefersDarkMode={prefersDarkMode} className={toolbarStyle().logo} />
        </RouteLink>;

    const footerStyle = makeStyles({
        wrapper: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            [theme.breakpoints.down('sm')]: {
                flexDirection: 'column'
            }
        },
        link: {
            color: theme.palette.text.primary,
            textDecoration: 'none',
            '&:hover': {
                color: theme.palette.secondary.main,
                textDecoration: 'none'
            }
        },
        repositoryLink: {
            display: 'flex',
            alignItems: 'center',
            fontSize: '1.1rem',
            [theme.breakpoints.down('sm')]: {
                marginBottom: theme.spacing(1)
            }
        }
    });

    const footerContent: React.FunctionComponent<{ expanded: boolean }> = () =>
        <Box className={footerStyle().wrapper}>
            <Link
                target='_blank'
                href='https://github.com/SmartIDE/SmartIDE'
                className={`${footerStyle().link} ${footerStyle().repositoryLink}`} >
                <GitHubIcon />&nbsp;SmartIDE/SmartIDE
            </Link>
            <Link href='https://smartide.cn/zh/about' className={footerStyle().link}>
                关于我们
            </Link>
        </Box>;

    const searchStyle = makeStyles({
        typography: {
            marginBottom: theme.spacing(2),
            fontWeight: theme.typography.fontWeightLight,
            letterSpacing: 4,
            textAlign: 'center'
        }
    });
    const searchHeader: React.FunctionComponent = () =>
        <Typography variant='h4' classes={{ root: searchStyle().typography }}>
            兼容VSCode标准IDE可用插件
        </Typography>;

    const additionalRoutes: React.FunctionComponent = () =>
        <Route path='/about' render={() => <About />} />;

    return {
        pageTitle: 'SmartIDE Marketplace (基于Eclipse OpenVSX)',
        themeType: prefersDarkMode ? 'dark' : 'light',
        elements: {
            toolbarContent,
            defaultMenuContent: DefaultMenuContent,
            mobileMenuContent: MobileMenuContent,
            footer: {
                content: footerContent,
                props: {
                    footerHeight: 69 // Maximal height reached for small screens
                }
            },
            searchHeader,
            additionalRoutes
        },
        urls: {
            extensionDefaultIcon: '/default-icon.png',
            namespaceAccessInfo: 'https://github.com/eclipse/openvsx/wiki/Namespace-Access',
            publisherAgreement: createAbsoluteURL([serverUrl, 'documents', 'publisher-agreement.md'])
        }
    };
}
