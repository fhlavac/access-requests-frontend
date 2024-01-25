import React, { useContext } from 'react';
import {
  capitalize,
  Breadcrumb,
  BreadcrumbItem,
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Flex,
  FlexItem,
  Spinner,
  Label,
} from '@patternfly/react-core';
import {
  Dropdown,
  DropdownItem,
  KebabToggle,
} from '@patternfly/react-core/deprecated';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, Provider } from 'react-redux';
import { addNotification } from '@redhat-cloud-services/frontend-components-notifications/redux';
import MUARolesTable from '../Components/mua-roles-table/MUARolesTable';
import { RegistryContext } from '../store';
import CancelRequestModal from '../Components/CancelRequestModal';
import AccessRequestWizard from '../Components/access-requests-wizard/AccessRequestsWizard';
import { getLabelProps } from '../Helpers/getLabelProps';
import { getInternalActions, StatusLabel } from '../Helpers/getActions';
import PropTypes from 'prop-types';
import apiInstance from '../Helpers/apiInstance';

const BaseAccessRequestDetailsPage = ({ isInternal }) => {
  const [request, setRequest] = React.useState();
  const { requestId } = useParams();
  const dispatch = useDispatch();
  React.useEffect(() => {
    apiInstance
      .get(
        `${API_BASE}/cross-account-requests/${requestId}/${
          isInternal ? '?query_by=user_id' : '?query_by=target_org'
        }`,
        { headers: { Accept: 'application/json' } }
      )
      .then((res) => {
        if (res.errors) {
          throw Error(res.errors.map((e) => e.detail).join('\n'));
        }
        setRequest(res);
      })
      .catch((err) => {
        dispatch(
          addNotification({
            variant: 'danger',
            title: 'Could not load access request',
            description: err.message,
          })
        );
      });
  }, []);

  // Modal actions
  const [openModal, setOpenModal] = React.useState({ type: null });
  const onModalClose = () => setOpenModal({ type: null });
  const actions = getInternalActions(
    request && request.status,
    requestId,
    setOpenModal
  );
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const requestDisplayProps = [
    ...(isInternal
      ? ['request_id', 'target_account', 'target_org']
      : ['first_name', 'last_name']),
    'start_date',
    'end_date',
    'created',
  ];
  return (
    <React.Fragment>
      <PageSection variant="light">
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to="..">{!isInternal && 'Red Hat '}Access Requests</Link>
            )}
          />
          <BreadcrumbItem>{requestId}</BreadcrumbItem>
        </Breadcrumb>
        <Flex direction={{ default: 'column', md: 'row' }}>
          <FlexItem grow={{ default: 'grow' }}>
            <Title headingLevel="h1" size="2xl" className="pf-v5-u-pt-md">
              {requestId}
            </Title>
          </FlexItem>
          {isInternal && actions.items.length > 0 && (
            <FlexItem alignSelf={{ default: 'alignRight' }}>
              <Dropdown
                position="right"
                toggle={
                  <KebabToggle
                    onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
                    id="actions-toggle"
                  />
                }
                isOpen={isDropdownOpen}
                isPlain
                dropdownItems={actions.items.map(({ title, onClick }) => (
                  <DropdownItem
                    key={title}
                    component="button"
                    onClick={onClick}
                  >
                    {title}
                  </DropdownItem>
                ))}
                isDisabled={actions.disable}
              />
            </FlexItem>
          )}
        </Flex>
      </PageSection>
      <PageSection>
        <Flex
          spaceItems={{ xl: 'spaceItemsLg' }}
          direction={{ default: 'column', lg: 'row' }}
        >
          <FlexItem
            flex={{ default: 'flex_1' }}
            alignSelf={{ default: 'alignSelfStretch' }}
          >
            <Card ouiaId="request-details" style={{ height: '100%' }}>
              <CardTitle>
                <Title headingLevel="h2" size="xl">
                  Request details
                </Title>
              </CardTitle>
              <CardBody>
                {!request ? (
                  <Spinner size="xl" />
                ) : (
                  <React.Fragment>
                    <div className="pf-v5-u-pb-md">
                      {isInternal ? (
                        <div>
                          <label>
                            <b>Request status</b>
                          </label>
                          <br />
                          <Label
                            className="pf-v5-u-mt-sm"
                            {...getLabelProps(request.status)}
                          >
                            {capitalize(request.status)}
                          </Label>
                        </div>
                      ) : (
                        <React.Fragment>
                          <label>
                            <b>Request decision</b>
                          </label>
                          <br />
                          <StatusLabel
                            requestId={requestId}
                            status={request.status}
                          />
                        </React.Fragment>
                      )}
                    </div>
                    {requestDisplayProps.map((prop, key) => (
                      <div className="pf-v5-u-pb-md" key={key}>
                        <label>
                          <b>
                            {capitalize(
                              prop.replace(/_/g, ' ').replace('id', 'ID')
                            )}
                          </b>
                        </label>
                        <br />
                        <div>{request[prop]}</div>
                      </div>
                    ))}
                  </React.Fragment>
                )}
              </CardBody>
            </Card>
          </FlexItem>
          <FlexItem
            flex={{ default: 'flex_3' }}
            grow={{ default: 'grow' }}
            alignSelf={{ default: 'alignSelfStretch' }}
          >
            <Card ouiaId="request-roles" style={{ height: '100%' }}>
              <CardTitle>
                <Title headingLevel="h2" size="xl">
                  Roles requested
                </Title>
              </CardTitle>
              <CardBody>
                {!request ? (
                  <Spinner size="xl" />
                ) : (
                  <MUARolesTable roles={request.roles} />
                )}
              </CardBody>
            </Card>
          </FlexItem>
        </Flex>
      </PageSection>
      {openModal.type === 'cancel' && (
        <CancelRequestModal requestId={requestId} onClose={onModalClose} />
      )}
      {openModal.type === 'edit' && (
        <AccessRequestWizard
          variant="edit"
          requestId={requestId}
          onClose={onModalClose}
        />
      )}
    </React.Fragment>
  );
};

// This component is a federated module used in https://github.com/RedHatInsights/insights-rbac-ui
// Try not to break RBAC.
const AccessRequestDetailsPage = (props) => {
  const { getRegistry } = useContext(RegistryContext);
  return (
    <Provider store={getRegistry().getStore()}>
      <BaseAccessRequestDetailsPage isInternal={props?.isInternal} />
    </Provider>
  );
};

AccessRequestDetailsPage.propTypes = {
  getRegistry: PropTypes.func,
  isInternal: PropTypes.bool,
};

BaseAccessRequestDetailsPage.propTypes = {
  isInternal: PropTypes.bool,
};

export default AccessRequestDetailsPage;
